from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext import deferred
from google.appengine.ext.webapp import util, template
from google.appengine.api import urlfetch
from google.appengine.ext import blobstore
from google.appengine.ext import db
from google.appengine.ext.webapp import blobstore_handlers
from google.appengine.ext.blobstore import BlobKey

import json
import logging
import re
import urllib
import datetime


block_size = 1000000


class PdbText(db.Model):

    pdb_id = db.StringProperty(required=True)
    n_content = db.IntegerProperty()
    user_id = db.StringProperty()
    description = db.TextProperty()


class Content(db.Model):

    content = db.TextProperty()

    @classmethod
    def key_for(cls, pdb_text, index):
        key = db.Key.from_path(
            cls.kind(),
            '%s:%d' % (pdb_text.key(), index),
            parent=pdb_text.key())
        return key


class JsonView(db.Model):

    view_id = db.StringProperty()
    pdb_id = db.StringProperty()
    json = db.TextProperty()
    time = db.DateTimeProperty(auto_now_add=True)
    user_id = db.StringProperty()


class UserProfile(db.Model):

    user_id = db.StringProperty()
    status = db.IntegerProperty()
    url_id = db.StringProperty()
    nickname = db.StringProperty()


# Accesor function


def get_model(model, filter_str, val):
    query = model.all()
    query.filter(filter_str, val)
    return query.get()


# PdbText 


def save_pdb_text(pdb_id, text, description=None, user_id=None):
    size = len(text)
    n_content = size / block_size
    if n_content * block_size < size:
        n_content += 1

    pdb_text = PdbText(pdb_id=pdb_id, n_content=n_content)
    if description is not None:
        pdb_text.description = description
    if user_id is not None:
        pdb_text.user_id = user_id
    pdb_text.put()

    for i in range(n_content):
        text_block = text[i*block_size:(i+1)*block_size]
        key = Content.key_for(pdb_text, i)
        content = Content(key=key, content=db.Text(text_block))
        content.put()

    logging.info("Stored %d bytes in %d chunks" % (size, n_content))

    return pdb_text


def delete_pdb_text(pdb_id):
    pdb_text = get_model(PdbText, 'pdb_id', pdb_id)
    for i in range(pdb_text.n_content):
        key = Content.key_for(pdb_text, i)
        content = Content.get(Content.key_for(pdb_text, i))
        if content:
            content.delete()
    pdb_text.delete()
    for view in JsonView.all().filter('pdb_id', pdb_id):
        view.delete()


def get_text_from_pdb_text(pdb_text):
    result = []
    if not pdb_text.n_content:
        return None
    for i in range(pdb_text.n_content):
        page = Content.get(Content.key_for(pdb_text, i))
        if page is None:
            return None
        result.append(page.content)
    return ''.join(result)


def filter_atom_lines(text):
    lines = []
    for line in text.splitlines():
        if line.startswith(('END', 'ENDMDL')):
            break
        if line.startswith(('ATOM', 'HETATM', 'TER')):
            lines.append(line)
    return '\n'.join(lines)


def get_text_from_rcsb_org(pdb_id):
    url = 'http://www.rcsb.org/pdb/files/%s.pdb' % pdb_id
    try:
        result = urlfetch.fetch(url, deadline=5)
    except urlfetch.ResponseTooLargeError:
        logging.info('File bigger than 10MB ' % pdb_id)
        return ""
    if result:
        if result.status_code != 200:
            logging.info('Error connecting to website')
            return ""
        else:
            return result.content


def get_pdb_text(pdb_id):
    pdb_text = get_model(PdbText, 'pdb_id', pdb_id)
    if pdb_text:
        raw_text = get_text_from_pdb_text(pdb_text)
        logging.info('Loaded %s from pdb_text datastore' % pdb_id)
        header = pdb_text.description
    else:
        logging.info('Fetching %s from rcsb.org' % pdb_id)
        raw_text = get_text_from_rcsb_org(pdb_id)
        header = get_pdb_header(raw_text)
        raw_text = filter_atom_lines(raw_text)

        if not raw_text:
            logging.info('Got nonsense from %s' % pdb_id)
            return ''            

        logging.info('Saving %s as pdb_text' % pdb_id)
        pdb_text = save_pdb_text(pdb_id, raw_text, header)

    header_lines = []
    if pdb_text.user_id is None:
        url = 'http://www.rcsb.org/pdb/explore/explore.do?structureId='
        header_line = "<a href='%s%s'>%s</a>: " % (url, pdb_id, pdb_id.upper())
    else:
        header_line = "Uploaded file: "
    header_lines.append(header_line)
    for i in range(0, len(header), 60):
        header_lines.append(header[i:i+60])
    logging.info(header_lines)
    result = ""
    for line in header_lines:
        result += 'TITLE     ' + line + '\n'
    result += raw_text

    return result


# Handle views


def get_view(pdb_id, view_id):
    q = JsonView.all()
    q.filter('pdb_id =', pdb_id)
    q.filter('view_id =', view_id)
    return q.get()


def get_view_dict(view):
    view_dict = json.loads(view.json)
    view_id = view_dict['view_id']
    view_dict['lock'] = True
    user = users.get_current_user()
    if users.is_current_user_admin():
        view_dict['lock'] = False
    elif view.user_id is None:
        view_dict['lock'] = False
    elif user and user.user_id() == view.user_id:
        view_dict['lock'] = False
    return view_dict


def get_views_json(pdb_id):
    query = JsonView.all()
    query.filter('pdb_id =', pdb_id)
    view_dicts = map(get_view_dict, list(query))
    return json.dumps(view_dicts, indent=2)


def save_views(view_dicts_json):
    user = users.get_current_user()
    view_dicts = json.loads(view_dicts_json)
    for view_dict in view_dicts:
        pdb_id = view_dict['pdb_id']
        view_id = view_dict['view_id']
        json_view = get_view(pdb_id, view_id)
        if json_view is None:
            json_view = JsonView(pdb_id=pdb_id, view_id=view_id)
            if user is not None:
                json_view.user_id = user.user_id()
            logging.info('Creating %s-%s' % (pdb_id, view_id))
        else:
            logging.info('Updating %s-%s' % (pdb_id, view_id))
        json_view.json = json.dumps(view_dict)
        json_view.put()


def get_user_views(user_id):
    query = JsonView.all()
    return list(query.filter('user_id', user_id))


# Housekeeping updates of datastore!


DEFER_BATCH_SIZE = 5


def defer_update_model(
      Model, update_fn, cursor=None, n_update=0):
    query = Model.all()
    if cursor:
        query.with_cursor(cursor)
    entries = query.fetch(limit=DEFER_BATCH_SIZE)
    for entry in entries:
        update_fn(entry)
    logging.info('This batch: processed %d' % (len(entries)))
    if len(entries) == 0:
        logging.info('In total: processed %d' % (n_update))
    else:
        n_update += len(entries)
        deferred.defer(
            defer_update_model,
            Model,
            update_fn,
            cursor=query.cursor(),
            n_update=n_update)


def convert_to_list(val):
    if isinstance(val, basestring):
        val = val.strip()
        n_nest = 0
        while val[-1] in [']', ',', ';']:
            if val[-1] == ']':
                n_nest += 1
            val = val[:-1].rstrip()
        for i in range(n_nest):
            val += ']'
        val = val.replace('\'', '"')
        return json.loads(val)
    else:
        return val


def convert_to_new_view_dict(old_view_dict):
    view_dict = {
        'version': 2,
        'show': {},
        'camera': {
            'pos': [0.0, 0.0, 0.0],
            'up': [0.0, 0.0, 0.0],
            'in': [0.0, 0.0, 0.0],
            'slab': {}
        }
    }

    for prop, val in old_view_dict.items():
        if prop in ['distances', 'labels', 'selected']:
            val = convert_to_list(old_view_dict[prop])
        if prop.startswith('show_'):
            new_prop = prop.replace('show_', '')
            view_dict['show'][new_prop] = val
        elif prop.startswith('camera_'):
            match = re.search('camera_(\w+)_(\w)', prop)
            vec_type = match.group(1)
            comp = match.group(2)
            i = "xyz".index(comp)
            view_dict["camera"][vec_type][i] = val
        elif prop in ['z_front', 'z_back', 'zoom']:
            view_dict["camera"]['slab'][prop] = val
        elif prop == 'distances':
            distances = [];
            for i, j in val:
                distances.append({
                    'i_atom1': i,
                    'i_atom2': j,
                    'z': 0.0
                    })
            view_dict['distances'] = distances
        elif prop == 'labels':
            labels = [];
            for i, text in val:
                labels.append({
                    'i_atom': i,
                    'text': urllib.unquote(text),
                    'z': 0.0,
                    })
            view_dict['labels'] = labels
        else:
            view_dict[prop] = val

    return view_dict


def clean_nickname(nickname):
    i_domain = nickname.find("@")
    if i_domain >= 0:
        return nickname[:i_domain]
    else:
        return nickname


def modify_view(view):
    user_id = view.user_id
    view_dict = json.loads(view.json)
    profile = get_model(UserProfile, 'user_id', user_id)
    if profile:
        nickname = clean_nickname(profile.nickname)
    elif profile and not user_id:
        profile.delete()
        nickname = '[public]'
    else:
        nickname = '[public]'
    if 'time' in view_dict:
      time_str = view_dict['time']
    elif view.time:
        time_str = view.time.strftime("%d/%m/%Y")
    else:
        time_str = datetime.datetime.now().strftime("%d/%m/%Y")

    view_dict['creator'] = "~ %s @%s" % (nickname, time_str)
    view.json = json.dumps(view_dict)
    view.put()


def update_view():
    defer_update_model(JsonView, modify_view)


def convert_data_js_to_pdb_text(js_text):
    pieces = js_text.split(';')
    piece = pieces[0].replace('var lines = ', '')
    return '\n'.join(convert_to_list(piece))


def get_pdb_header(raw_text):
    header = ""
    for line in raw_text.splitlines():
        words = line.split()
        if len(words) == 0:
            continue
        if words[0] in 'TITLE':
            header += line[10:]
    return header


def modify_metadata(metadata):
    """
    Find uploaded files referenced in UploadStructureMetaData
    and blobstore, and save as pdb_text
    """
    pdb_id = metadata.pdb_id
    entry = get_model(UploadedPdb, 'pdb_id', pdb_id)
    if entry is None:
        uploaded_pdb = UploadedPdb(pdb_id=pdb_id)
        filename = metadata.blob_info.filename
        uploaded_pdb.filename = filename
        uploaded_pdb.creator = metadata.creator
        uploaded_pdb.put()
    blob_key = metadata.blob_info
    blobreader = blobstore.BlobReader(blob_key)
    raw_pdb_text = blobreader.read()
    raw_pdb_text = filter_atom_lines(pdb_text)
    pdb_text = get_model(PdbText, 'pdb_id =', pdb_id)
    if pdb_text is not None:
        pdb_text.description = metadata.blob_info.filename
        pdb_text.user_id = metadata.creator.user_id()
    else:
        save_pdb_text(pdb_id, raw_pdb_text, metadata.blob_info.filename)


def update_metadatas():
    defer_update_model(UploadStructureMetaData, modify_metadata)


def modify_pdb_text(pdb_text):
    pdb_id = pdb_text.pdb_id
    text = get_text_from_pdb_text(pdb_text)
    if text is None or not filter_atom_lines(text):
        delete_pdb_text(pdb_id)


def update_pdb_text():
    defer_update_model(PdbText, modify_pdb_text)


def modify_user_pref(user_pref):
    user = user_pref.user
    if user is None:
        return

    user_id = user.user_id()

    user_profile = get_model(UserProfile, 'user_id', user_id)
    if user_profile is not None:
        return

    # Copy to new UserProfile
    user_profile = UserProfile(
        user_id=user_id, 
        url_id=user_pref.url_id,
        nickname=user.nickname())
    user_profile.put()
    logging.info('Created user_profile ' + user_id)
    user_pref.put()        

    logging.info('Updated user_pref ' + user_id)


def update_user_pref():
    defer_update_model(UserPreferences, modify_user_pref)


def delete_entity(entity):
    entity.delete()


def update_delete():
    defer_update_model(blobstore.BlobInfo, delete_entity)


