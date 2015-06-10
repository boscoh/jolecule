#!/usr/bin/env python

from __future__ import print_function

import os
import sys
import random
import webbrowser
import threading
import json
import urllib
import urllib2
import urlparse
import logging
import cgi
import shutil

from flask import Flask, request, redirect, send_from_directory
from jinja2 import Environment, FileSystemLoader


root_dir = os.path.dirname(__file__)
server_url = os.path.join(root_dir, 'flask_server.url')
server_log = os.path.join(root_dir, 'flask_server.log')
logging.basicConfig(filename=server_log, level=logging.DEBUG)
app = Flask(__name__)


__doc__ = '''
flask_server.py - local server for jolecule to load local 
pdb files into the browser on your machine.

usage:   flask_server.py start
         flask_server.py status
         flask_server.py stop
'''


def jinja_it(fname, attr):
    dirname, basename = os.path.split(fname)
    jinja2_env = Environment(
        loader=FileSystemLoader(dirname))
    template = jinja2_env.get_template(basename)
    return template.render(**attr)


def read_pdb_text(filename):
    text = ''
    if os.path.isfile(filename):
        basename = os.path.split(filename)[1]
        text += 'TITLE     {}: \n'.format(basename)
        with open(filename) as f:
            text += f.read()
    return text


def read_views_json(filename):
    if os.path.isfile(filename):
        with open(filename) as f:
            text = f.read()
        if text:
            return text
    return json.dumps({})


def convert_to_views_json_fname(fname):
    return fname.replace('.pdb', '.views.json')


@app.route('/jolecule.css', methods=['GET'])
def send_jolecule_css():
    return open(os.path.join(root_dir, 'static/jolecule.css')).read()


def compile_jolecule_js():
    js_fnames = """
        util v3 animation canvaswidget protein proteindisplay
        embedjolecule fullpagejolecule dataserver
        """.split()
    js_fnames = [
        os.path.join(
            root_dir,
            'js',
            '%s.js' %
            f) for f in js_fnames]
    js_list = [open(f).read() for f in js_fnames]
    return '\n\n'.join(js_list)


@app.route('/js', defaults={'path': ''}, methods=['GET'])
@app.route('/js/<path:path>')
def get_js_file(path):
    fname = os.path.join(root_dir, 'js', path)
    if fname.endswith('jolecule.js'):
        text = compile_jolecule_js()
    elif os.path.isfile(fname):
        text = open(fname).read()
    if text:
        return text
    else:
        return 'error', 501


@app.route('/pdbtext', methods=['GET'])
def get_pdb_file():
    return read_pdb_text(request.args.get('file'))


@app.route('/views', methods=['GET'])
def get_views_json():
    filename = request.args.get('file')
    filename = convert_to_views_json_fname(filename)
    return read_views_json(filename)


@app.route('/save/views', methods=['POST'])
def post_views_json():
    json_text = request.get_data()
    filename = convert_to_views_json_fname(request.args.get('file'))
    with open(filename, 'w') as f:
        f.write(json_text)
    return 'success', 201


@app.route('/delete/view', methods=['POST'])
def delete_view():
    filename = convert_to_views_json_fname(request.form['pdb_id'])
    with open(filename) as f:
        text = f.read()

    view_id = request.form['view_id']
    views = json.loads(text)
    for i in range(len(views)):
        view = views[i]
        if view['view_id'] == view_id:
            del views[i]
            with open(filename, 'w') as f:
                f.write(json.dumps(views))
            return 'success', 201

    return 'not found', 404


def make_data_server_js(filename, data_server_name):
    pdb_text = read_pdb_text(filename)
    atom_lines_json = json.dumps(pdb_text.splitlines())
    views_json = read_views_json(convert_to_views_json_fname(filename))
    return jinja_it(
        os.path.join(root_dir, 'templates', 'data_server.jinja2.js'),
        {
            'data_server_name': data_server_name,
            'pdb_id': filename,
            'atom_lines': atom_lines_json,
            'view_dicts': views_json,
        }
    )


@app.route('/data_server.js', methods=['POST', 'GET'])
def make_data_server():
    filename = request.args.get('file')
    data_server_name = request.args.get('name')
    if os.path.isfile(filename):
        return make_data_server_js(filename, data_server_name)
    else:
        return 'not found', 404


@app.route('/structure', methods=['GET'])
def get_structure():
    filename = request.args.get('file')
    return jinja_it(
        os.path.join(root_dir, 'templates', 'local_structure.jinja2.html'),
        {
            'pdb_id': filename
        }
    )


def make_embed_pdb_html_text(
        filename, data_server_name, view_id,
        js_dir, css_dir, data_server_url, extra_html=''):
    embed_js = jinja_it(
        os.path.join(root_dir, 'templates', 'embed_pdb.jinja2.js'),
        { 
            'js_dir': '%s' % js_dir,
            'css_dir': '%s' % css_dir,
            'data_server_url': '%s' % data_server_url,
            'data_server': data_server_name,
            'view_id': view_id,
            'is_loop': json.dumps(False),
            'is_editable': json.dumps(False),
        }
    )
    index_html_text = jinja_it(
        os.path.join(root_dir, 'templates', 'embed_pdb.jinja2.html'),
        {
            'pdb_id': filename,
            'embed_js': embed_js,
            'escaped_embed_js': cgi.escape(embed_js),
            'data_server': data_server_name,
            'extra_html': extra_html,
        }
    )
    return index_html_text


@app.route('/embed/pdb', methods=['GET'])
def make_embed_page():
    filename = request.args.get('pdb_id')
    data_server_name = 'data_server'
    view_id = request.args.get('view_id')
    if not view_id:
        view_id = ''

    embed_dir = filename + '.jolecule'
    if not os.path.isdir(embed_dir):
        os.makedirs(embed_dir)

    index_html = os.path.join(embed_dir, 'index.html')
    open(index_html, 'w').write(
        make_embed_pdb_html_text(
            filename, data_server_name, view_id,
            '.', '.', './data_server.js'))

    data_server = os.path.join(embed_dir, 'data_server.js')
    open(data_server, 'w').write(
        make_data_server_js(
           filename, data_server_name))

    shutil.copy(os.path.join(root_dir, 'static', 'jolecule.css'), embed_dir)
    shutil.copy(os.path.join(root_dir, 'js', 'jquery-2.0.3.js'), embed_dir)
    shutil.copy(os.path.join(root_dir, 'js', 'jquery.scrollTo.js'), embed_dir)
    jolecule_js = os.path.join(embed_dir, 'jolecule.js')
    open(jolecule_js, 'w').write(compile_jolecule_js())

    full_index_html = "file://" + os.path.abspath(index_html)
    app.logger.info('redirect: ' + full_index_html)

    return make_embed_pdb_html_text(
        filename, 
        data_server_name, 
        view_id,
        '/js', 
        '', 
        '/data_server.js?file=%s&name=%s' % (filename, data_server_name),
        '<h3>A local version has been created for you at <br> %s</h3>' % full_index_html)


@app.route('/isrunning', methods=['GET'])
def isrunning():
    return "true"


@app.route('/shutdown', methods=['GET'])
def shutdown():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()


def start_server():
    port = random.randint(5000, 65535)
    with open(server_url, 'w') as f:
        f.write('http://127.0.0.1:{}'.format(port))
    app.run(port=port)


def get_url():
    if os.path.isfile(server_url):
        with open(server_url) as f:
            return f.read()
    else:
        return ''


def is_running():
    try:
        response = urllib2.urlopen(get_url() + '/isrunning')
        text = response.read()
        if text == "true":
            return True
    except:
        pass
    return False


def shutdown_server():
    try:
        response = urllib2.urlopen(get_url() + '/shutdown')
    except:
        pass
    print("Server shut down.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
    elif sys.argv[1] == 'start':
        if not is_running():
            start_server()
        else:
            print("Already running: {}".format(get_url()))
    elif sys.argv[1] == 'stop':
        if is_running():
            shutdown_server()
    elif sys.argv[1] == 'status':
        if is_running():
            print("Running: {}".format(get_url()))
        else:
            print("Not running.")

