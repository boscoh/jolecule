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

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext import db
from google.appengine.ext.webapp import util, template
from google.appengine.api import urlfetch
from django.utils import simplejson

import logging
import urllib
import datetime
import re

import pdbstruct
import vector3d
import math


class Structure(db.Model):
  id = db.StringProperty(required=True)
  text = db.TextProperty(required=True)
  n_text_block = db.IntegerProperty()
  i_text_block = db.IntegerProperty()
  

"""

class Structure(db.Model):
  id = db.StringProperty(required=True)
  n_text_block = db.IntegerProperty()


result = []
for i in range(structure.n_text_block):
  key = Content.key_for(structure, i)
  page = Content.get(key)
  result.append(page.content)
text = ''.join(result)

class Content(db.Model):
  page = db.IntegerProperty()
  content = db.TextProperty()

  @classmethod
  def key_for(cls, structure, index):
  key = db.Key.from_path(cls.kind(), '%s:%d' % (structure.key(), index), parent=structure.key())

"""
  
def make_js_loader_from_pdb(text):
  lines = text.splitlines() 

  new_lines = []
  for l in lines:
    if l.startswith("ATOM") or l.startswith("HETATM"):
      new_lines.append(l[:-1])
    if l.startswith("ENDMDL"):
      break
  new_text = '\n'.join(new_lines)
  
  polymer = pdbstruct.Polymer(new_text)
  atoms = polymer.atoms()
  for i, a in enumerate(atoms):
    a.i_atom = i
  n = len(atoms)
  residues = polymer.residues()
  n_res = len(residues)
  bonds = []
  max_sq = 0.0
  small_cutoff = 1.2*1.2
  large_cutoff = 1.9*1.9
  for i in range(n_res):
    for j in range(n_res):
      if i<=j:
        r1 = residues[i]
        r2 = residues[j]
        if 'CA' in r1._atom_dict:
          c = r1.atom('CA')
        elif "C3'" in r1._atom_dict:
          c = r1.atom("C3'")
        else:
          c = None
        if 'CA' in r2._atom_dict:
          d = r2.atom('CA')
        elif "C3'" in r2._atom_dict:
          d = r2.atom("C3'")
        else:
          d = None
        if c is not None and d is not None:
          d_sq = vector3d.pos_distance_sq(c.pos, d.pos)
          if d_sq > max_sq:
            max_sq = d_sq
          if d_sq > 64:
            continue
        for a in r1._atom_dict.values():
          for b in r2._atom_dict.values():
            if a == b:
              continue
            if ((a.element == "H") or (b.element == "H")):
              cutoff = small_cutoff
            else:
              cutoff = large_cutoff
            d_sq = vector3d.pos_distance_sq(a.pos, b.pos)
            if d_sq < cutoff:
              bonds.append([a.i_atom, b.i_atom])

  max_length = math.sqrt(max_sq)

  bond_str = 'var bond_pairs = [' + '\n'
  for i, pair in enumerate(bonds):
    if i>0:
      bond_str += ', '
    bond_str += '[%d, %d]' % (pair[0], pair[1])
    if i % 6 == 5:
      bond_str += '\n'
  bond_str += '\n];\n\n'

  lines_str = 'var lines = [' + "\n"
  for l in lines:
    if l.startswith("ATOM") or l.startswith("HETATM"):
      lines_str += '"%s",\n' % l[:-1]
    if l.startswith("ENDMDL"):
      break
  lines_str += '];\n\n'
  
  max_length_str = "var max_length = %f;" % max_length

  s = lines_str + bond_str + max_length_str
  return s
   
   
class PdbJsHandler(webapp.RequestHandler):
  def get(self):
    pdb_id = self.request.path.split('/')[-1].replace('.js', '')
    q = Structure.all()
    q.filter("id =", pdb_id)
    results = [r for r in q]
    block_size = 1000000
    if results:
      text = "// REMARK From database\n"
      # logging.debug('Found %d pieces cached for %s' % \
      #                (len(results), pdb_id))
      if len(results) == 1:
        text += results[0].text
      else:
        pairs = [(r.i_text_block, r) for r in results]
        pairs.sort()
        for i, s in pairs:
          # logging.debug("appending %dth text [%d]: %s" % \
          #      (i, len(s.text), s.text[-100:]))
          text += s.text
    else:
      # logging.debug("Querying RCSB for: %s" % pdb_id)
      url = 'http://www.rcsb.org/pdb/files/%s.pdb' % pdb_id
      try:
        result = urlfetch.fetch(url, deadline=5)
      except urlfetch.ResponseTooLargeError:
        text = "// Sorry, but Google has a 1MB restriction " + \
               "in fetching files from sites such as the RCSB"
        result = None

      if result:
        if result.status_code != 200:
          text = "// Downloading error from the RCSB website"
        elif len(result.content) > block_size:
          text = "// Sorry, but Google has a 1MB restriction " + \
           "in fetching files from sites such as the RCSB"
        else:
          raw_text = result.content
          # logging.debug("Converting PDB into javascript object...")
          text = "// REMARK from " + url + '\n'
          text += make_js_loader_from_pdb(raw_text)
          string_len = len(text)
          n_text_block = string_len/block_size
          if n_text_block*block_size < string_len:
            n_text_block += 1
          logging.debug("Storing javascript text object [%d]" % len(text))
          logging.debug("  in %d chunks" % n_text_block)
          for i in range(n_text_block):
            text_block = text[i*block_size:(i+1)*block_size]
            logging.debug("Storing chunk %d" % i)
            structure = Structure(
               id=pdb_id,  
               n_text_block=n_text_block,
               i_text_block=i,
               text=db.Text(text_block))
            structure.put()
    html = text
    self.response.out.write(html)


class PdbPageHandler(webapp.RequestHandler):
  def get(self):
    pdb_id = self.request.path.split('/')[-1].replace('.js', '')
    pdb_html = open('pdb.html', 'r').read()
    pdb_html = pdb_html.replace(
        'login_url', 
        users.create_login_url(self.request.path))
    user = users.get_current_user()
    if user is None:
      pdb_html = pdb_html.replace('user_status', 'login')
      pdb_html = pdb_html.replace('user_nick_name', 'public')
    else:
      pdb_html = pdb_html.replace('user_status', user.nickname())
      pdb_html = pdb_html.replace('user_nick_name', user.nickname())
    html = pdb_html 
    self.response.out.write(html)

 
class MainHandler(webapp.RequestHandler):
  def get(self):
    html = open('main.html', 'r').read()
    self.response.out.write(html)

    
"""
For creating unique ids.
VIEW_ID = db.Key.from_path('Sequences', 'ViewId')
unique_id = db.allocate_ids(VIEW_ID, 1)[0]
"""


class View(db.Model):
  pdb_id = db.StringProperty(required=True)
  id = db.StringProperty(required=True)
  order = db.IntegerProperty()
  time = db.DateTimeProperty(auto_now_add=True)
  creator = db.UserProperty(auto_current_user_add=True)
  modifier = db.UserProperty(auto_current_user=True)
  show_sidechain = db.BooleanProperty()
  show_hydrogen = db.BooleanProperty()
  show_ca_trace = db.BooleanProperty()
  show_trace = db.BooleanProperty()
  show_water = db.BooleanProperty()
  show_ribbon = db.BooleanProperty()
  show_backbone = db.BooleanProperty()
  show_all_atom = db.BooleanProperty()
  show_ligands = db.BooleanProperty()
  res_id = db.StringProperty()  # Residue ID
  i_atom = db.IntegerProperty()
  labels = db.TextProperty()
  distances = db.TextProperty()
  selected = db.TextProperty()
  text = db.TextProperty()
  z_front = db.FloatProperty()
  z_back = db.FloatProperty()
  zoom = db.FloatProperty() 
  camera_pos_x = db.FloatProperty()
  camera_pos_y = db.FloatProperty()
  camera_pos_z = db.FloatProperty() 
  camera_up_x = db.FloatProperty()
  camera_up_y = db.FloatProperty()
  camera_up_z = db.FloatProperty()
  camera_in_x = db.FloatProperty()
  camera_in_y = db.FloatProperty()
  camera_in_z = db.FloatProperty()


def get_view(pdb_id, id):
  q = View.all()
  q.filter('pdb_id =', pdb_id)
  q.filter('id =', id)
  results = q.fetch(1)
  if results:
    return results[0]
  else:
    return None


class SaveViewHandler(webapp.RequestHandler):
  def post(self):
    data = {}
    for name in self.request.arguments():
      if 'show' in name:
        data[name] = (self.request.get(name).lower() == 'true')
      elif 'camera' in name or 'z_' in name or 'zoom' in name:
        data[name] = float(self.request.get(name))
      elif 'order' in name or 'i_atom' in name:
        data[name] = int(self.request.get(name))
      else:
        data[name] = self.request.get(name)
    view_id = data['id']
    pdb_id = data['pdb_id']
    view = get_view(pdb_id, view_id)
    if not view:
      view = View(pdb_id=pdb_id, id=view_id)
    for name in data.iterkeys():
      setattr(view, name, data.get(name))
    view.put()


class DeleteViewHandler(webapp.RequestHandler):
  def post(self):
    pdb_id = self.request.get('pdb_id')
    id = self.request.get('id')
    view = get_view(pdb_id, id)
    if view:
      view.delete()


def to_dict(model_instance):
  # return model_instance.__dict__['_entity']
  def iter_model(model_instance):
    for name in model_instance.properties().iterkeys():
      yield name, getattr(model_instance, name)
  return dict(iter_model(model_instance))

 
class ReturnViewsHandler(webapp.RequestHandler):
  def get(self):
    user = users.get_current_user()
    pdb_id = self.request.path.split('/')[-1]

    q = View.all()
    q.filter('pdb_id =', pdb_id)
    results = q.fetch(1000)

    out_list = []

    for result in results:

      changed = False
      if result.time is None:
        result.time = datetime.datetime.today()
        changed = True
      if result.i_atom is None:
        result.i_atom = -1
        changed = True
      if result.distances is None:
        result.distances = "[];"
        changed = True
      if result.labels is None:
        result.labels = "[];"
        changed = True
      if changed:
        result.put()

      entities = {}

      raw_entities = to_dict(result)

      t = raw_entities.pop('time')
      entities['time'] = t.strftime("%d/%m/%Y")

      def set_nickname(name):
        user = raw_entities.pop(name, None)
        if user:
           entities[name] = user.nickname()
        else:
          entities[name] = 'public'
      set_nickname('creator')
      set_nickname('modifier')
      logging.info('user is ' + str(user))
      logging.info('creator is ' + str(result.creator))

      entities['lock'] = False
      if result.creator is not None:
        if result.creator != user:
          entities['lock'] = True
      logging.info('lock is ' + str(entities['lock']))

      entities.update(raw_entities)
      logging.info('-------')
      for k, v in entities.items():
        logging.info(unicode(k) + ": " + unicode(v))

      out_list.append(entities)

    self.response.out.write(simplejson.dumps(out_list))


def main():
  logging.getLogger().setLevel(logging.DEBUG)

  application = webapp.WSGIApplication(
      [('/', MainHandler), 
       ('/ajax/pdb/delete', DeleteViewHandler),
       ('/ajax/pdb/.*', ReturnViewsHandler),
       ('/ajax/new_view', SaveViewHandler),
       ('/pdb/.*[.]js', PdbJsHandler),  # Javascript (data)
       ('/pdb/.*', PdbPageHandler)],  # HTML
      debug=True)

  util.run_wsgi_app(application)


if __name__ == '__main__':
  main()
