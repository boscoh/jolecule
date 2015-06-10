#!/usr/bin/env python
#
# Copyright 2010 - Bosco Ho
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


# VIEW_ID = db.Key.from_path('Sequences', 'ViewId')
# unique_id = db.allocate_ids(VIEW_ID, 1)[0]


from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext import deferred
from google.appengine.ext.webapp import util
from google.appengine.api import urlfetch
from google.appengine.ext import db

from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers
from google.appengine.ext.blobstore import BlobKey

from jinja2 import Environment, FileSystemLoader

import os
import sys
import urllib
import urlparse
import datetime
import random
import cgi
import json
import logging

from bs4 import BeautifulSoup

import gae_model


def jinja_it(fname, attr):
    dirname, basename = os.path.split(fname)
    jinja2_env = Environment(
        loader=FileSystemLoader(dirname))
    template =  jinja2_env.get_template(basename)
    return template.render(**attr)


def random_string(n_char):
    chars = "0123456789abcdefghiklmnopqrstuvwxyz"
    s = ''
    for i in range(n_char):
        j = random.randint(0, len(chars) - 1)
        s += chars[j]
    return s


def get_current_user_profile():
    user = users.get_current_user()

    if user is None:
        return None

    user_id = user.user_id()

    profile = gae_model.get_model(
        gae_model.UserProfile, 'user_id', user_id)

    if profile is None:
        profile = gae_model.UserProfile(
            user_id=user.user_id(), 
            nickname=user.nickname())
        profile.put()

    if profile.nickname is None:
        profile.nickname = user.nickname()
        profile.put()

    return profile


def make_page(url, body):
    profile = get_current_user_profile()
    if profile is None:
        attr =  {
            'user_status': 'login',
            'login_url': users.create_login_url(url),
            'user_nickname': 'public',
            'user_prefs': '',
        }
    else:
        attr =  {
            'user_status': 'logout',
            'login_url': users.create_logout_url(url),
            'user_nickname': profile.nickname,
            'user_prefs': '<a href="/user/%s">%s</a> &#183; ' % \
                           (profile.user_id, profile.nickname),
        }
    attr['body'] = body
    return jinja_it('templates/page.jinja2.html', attr)


def is_pdb_id(s):
    tokens = s.split()
    if len(tokens) != 1:
        return False
    pdb_id = tokens[0]
    if len(pdb_id) != 4:
        return False
    return pdb_id[0].isdigit()


def parse_rcsb_search_entries(search_words):
    url = 'http://www.rcsb.org/pdb/search/navbarsearch.do?'
    url += urllib.urlencode({'q': search_words})
    urlfetch.set_default_fetch_deadline(45)
    response = urlfetch.fetch(url)

    soup = BeautifulSoup(response.content)

    entries = []
    for query in soup.find_all(class_='query'):

        entry = {}

        entry['pdb_id'] = query.find(class_='qrb_structid').text.strip()
        entry['title'] = query.find(class_='qrb_title').text.strip()
        entry['authors'] = ' '.join([e.text for e in query.find_all(class_='seAuthors')])

        for key_val in query.find_all(class_='se_key'):
            key = key_val.text.strip()
            val = None
            if key_val.next_sibling and key_val.next_sibling.next_sibling:
                val = ' '.join(key_val.next_sibling.next_sibling.stripped_strings)
            if key == 'Residue Count':
                entry['n_residue'] = val
            elif key == 'Release:':
                entry['year'] = val[:4]
            elif key == 'Experiment:':
                entry['experiment'] = ' '.join(val.split())
        entries.append(entry)

    return entries


class PdbTextHandler(webapp.RequestHandler):

    def get(self):
        pdb_id = self.request.path.split('/')[-1].replace('.txt', '')
        self.response.out.write(gae_model.get_pdb_text(pdb_id))


class SaveViewsHandler(webapp.RequestHandler):

    def post(self):
        gae_model.save_views(self.request.body)
        self.response.set_status(201)


class DeleteViewHandler(webapp.RequestHandler):

    def post(self):
        pdb_id = self.request.get('pdb_id')
        view_id = self.request.get('view_id')
        view = gae_model.get_view(pdb_id, view_id)
        if view:
            view.delete()
        self.response.set_status(201)


class ViewsHandler(webapp.RequestHandler):

    def get(self):
        pdb_id = self.request.path.split('/')[-1].replace('.views.json', '')
        self.response.out.write(gae_model.get_views_json(pdb_id))


class EmbedDataserverHandler(webapp.RequestHandler):

    def get(self):
        pdb_id = self.request.get('pdb_id')
        data_server_name = self.request.get('name')

        view_dicts_json = gae_model.get_views_json(pdb_id)
        pdb_text = gae_model.get_pdb_text(pdb_id)
        atom_lines_json = json.dumps(pdb_text.splitlines())

        self.response.out.write(
            jinja_it(
                'templates/data_server.jinja2.js',
                {
                    'data_server_name': data_server_name,
                    'pdb_id': pdb_id,
                    'atom_lines': atom_lines_json,
                    'view_dicts': view_dicts_json,
                }
            )
        )


class EmbedPdbHandler(webapp.RequestHandler):

    def get(self):
        pdb_id = self.request.get('pdb_id')
        view_id = self.request.get('view')
        data_server_name = 'data_server_%s' % pdb_id
        if not view_id:
            view_id = ''
        embed_js = jinja_it(
            'templates/embed_pdb.jinja2.js',
            { 
                'js_dir': '/js',
                'css_dir': '',
                'data_server_url': '/data_server.js?pdb_id=%s&name=%s' % (pdb_id, data_server_name),
                'data_server': data_server_name,
                'view_id': view_id,
                'is_loop': json.dumps(False),
                'is_editable': json.dumps(False),
            }
        )
        escaped_embed_js = cgi.escape(
            jinja_it(
                'templates/embed_pdb.jinja2.js',
                { 
                    'js_dir': 'http://jolecule.com/js',
                    'css_dir': 'http://jolecule.com/',
                    'data_server_url': 'http://jolecule.com/data_server.js?pdb_id=%s&name=%s' % (pdb_id, data_server_name),
                    'data_server': data_server_name,
                    'view_id': view_id,
                    'is_loop': json.dumps(False),
                    'is_editable': json.dumps(False),
                }
            )
        )
        self.response.out.write(
            make_page(
                self.request.path,
                jinja_it(
                    'templates/embed_pdb.jinja2.html',
                    { 
                        'embed_js': embed_js,
                        'pdb_id': pdb_id,
                        'escaped_embed_js': escaped_embed_js
                    }
                )
            )
        )


class PdbPageHandler(webapp.RequestHandler):

    def get(self):
        pdb_id = self.request.path.split('/')[-1].lower()
        profile = get_current_user_profile()
        nickname = profile.nickname if profile else ''
        self.response.out.write(
            make_page(
                self.request.path,
                jinja_it(
                    'templates/structure.jinja2.html',
                    {
                        'pdb_id': pdb_id,
                        'user_nickname': nickname,
                    }
                )
            )
        )


class IndexHandler(webapp.RequestHandler):

    def get(self):
        embed_js = jinja_it(
            'templates/embed_pdb.jinja2.js',
            { 
                'js_dir': '/js',
                'css_dir': '',
                'data_server_url': '/data_server.js?pdb_id=1mbo&name=data_server_1mbo',
                'data_server': 'data_server_1mbo',
                'view_id': 'view:000000',
                'is_loop': json.dumps(True),
                'is_editable': json.dumps(False),
            }

        )
        self.response.out.write(
            make_page(
                self.request.path,
                jinja_it(
                    'templates/index.jinja2.html',
                    {
                        'embed_js': embed_js
                    }
                )
            )
        )


class JoleculeJsHandler(webapp.RequestHandler):

    def get(self):
        if not hasattr(self, 'js'):
            js_fnames = """
            util v3 animation canvaswidget protein proteindisplay
            embedjolecule fullpagejolecule dataserver
            """.split()
            js_fnames = ['js/%s.js' % f for f in js_fnames]
            js_list = [open(f).read() for f in js_fnames]
            self.js = '\n\n'.join(js_list)
        self.response.out.write(self.js)


class UploadHandler(blobstore_handlers.BlobstoreUploadHandler):

    def post(self):
        profile = get_current_user_profile()

        upload_files = self.get_uploads('file')
        blob_info = upload_files[0]
        blob_key = blob_info.key()
        blobreader = blobstore.BlobReader(blob_key)

        text = blobreader.read()
        text = gae_model.filter_atom_lines(text)
        if text:
            gae_model.save_pdb_text(
                random_string(6), 
                text, 
                blob_info.filename, 
                profile.user_id)
        blob_info.delete()

        self.redirect('/user/' + profile.user_id)


class DeletePdbHandler(webapp.RequestHandler):

    def post(self):
        pdb_id = self.request.get('pdb_id')
        logging.info('delete pdb' + str(pdb_id))
        gae_model.delete_pdb_text(pdb_id)
        self.response.set_status(201)


class UserPageHandler(webapp.RequestHandler):

    def get(self):
        user_id = self.request.path.split('/')[-1]

        curr_profile = get_current_user_profile()
        is_user_page = user_id == curr_profile.user_id
        if is_user_page:
            profile = curr_profile
        else:
            profile = gae_model.get_model(gae_model.UserProfile, 'user_id', user_id)
        if profile is None:
            self.error(500)
            return

        is_admin = users.is_current_user_admin()
        if not is_admin and not is_user_page:
            self.error(500)
            return

        views = []
        for view in gae_model.get_user_views(profile.user_id):
            data = json.loads(view.json)
            name = '%s#%s' % (data['pdb_id'], data['view_id'])
            views.append({
                'url': '/pdb/%s' % name,
                'name': name,
                'text': data['text'][:40],
            })

        pdbs = []
        for pdb_text in gae_model.PdbText.all().filter('user_id', profile.user_id):
            pdbs.append({
                'pdb_id': pdb_text.pdb_id,
                'name': pdb_text.description,
            })

        self.response.out.write(
            make_page(
                self.request.path,
                jinja_it(
                    'templates/user.jinja2.html',
                    {
                        'nickname': profile.nickname,
                        'upload_url': blobstore.create_upload_url('/upload'),
                        'views': views,
                        'pdbs': pdbs,
                    }
                )
            )
        )


class UserListHandler(webapp.RequestHandler):

    def get(self):
        if not users.is_current_user_admin():
            self.error(500)
        else:
            workers = []
            lurkers = []
            for profile in gae_model.UserProfile.all():
                views = gae_model.get_user_views(profile.user_id)
                pdbs = list(gae_model.PdbText.all().filter('user_id', profile.user_id))
                entry = {
                    'url': profile.user_id,
                    'nickname': profile.nickname,
                    'n_view': len(views),
                    'n_pdb': len(pdbs),
                }
                if entry['n_view'] or entry['n_pdb']:
                    workers.append(entry)
                else:
                    lurkers.append(entry)
            self.response.out.write(
                make_page(
                    self.request.path,
                    jinja_it(
                        'templates/userlist.jinja2.html',
                        {
                            'workers': workers,
                            'lurkers': lurkers,
                        }
                    )
                )
            )


class SearchHandler(webapp.RequestHandler):

    def get(self):
        search_words = self.request.get('q')
        pdb_id = search_words.strip()
        if is_pdb_id(pdb_id):
            self.redirect("/pdb/" + pdb_id)
        else:
            entries = parse_rcsb_search_entries(search_words)
            self.response.out.write(
                make_page(
                    self.request.path,
                    jinja_it(
                        'templates/search.jinja2.html',
                        {
                            'search_words': search_words,
                            'entries': entries,
                        }
                    )
                )
            )


class UpdateHandler(webapp.RequestHandler):

    def get(self):
        fn_name = self.request.path.split('/')[-1]
        if hasattr(model, fn_name):
            deferred.defer(getattr(model, fn_name))
            self.response.out.write('Update successful.')
        else:
            self.response.out.write('"%s" not update function' % fn_name)


def main():

    logging.getLogger().setLevel(logging.DEBUG)

    application = webapp.WSGIApplication(
        [
            ('/', IndexHandler),
   
            ('/js/jolecule.js', JoleculeJsHandler),
   
            ('/pdb/.*\.txt', PdbTextHandler),
            ('/pdb/.*\.views.json', ViewsHandler),
            ('/delete/view', DeleteViewHandler),
            ('/save/views', SaveViewsHandler),
            ('/pdb/.*', PdbPageHandler),
   
            ('/data_server\.js.*', EmbedDataserverHandler),
            ('/embed/pdb.*', EmbedPdbHandler),
   
            ('/user/.*', UserPageHandler),
            ('/userlist', UserListHandler),
            ('/upload', UploadHandler),
            ('/delete/pdb', DeletePdbHandler),
   
            ('/search.*', SearchHandler),
   
            ('/update.*', UpdateHandler),
        ],

        debug=True)

    util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
