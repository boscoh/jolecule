#!/usr/bin/env python

from __future__ import print_function

import os
import sys
import webbrowser
import time
import urllib
import urlparse
import subprocess

import tkform
import tkFileDialog

import _version

__doc__ = """\

jolecule.py %s - local version of the joleucle protein viewer in the browser.

usage: jolecule.py pdb

""" % _version.__version__


root_dir = os.path.dirname(__file__)
server = os.path.join(root_dir, 'flask_server.py')


def is_server_running():
    p = subprocess.Popen(['python', server, 'status'], stdout=subprocess.PIPE)
    out = p.stdout.read()
    return out.strip().lower().startswith('running')


def start_server():
    subprocess.Popen(['python', server, 'start'])
    while not is_server_running():
        time.sleep(0.1)


def open_pdb(fname):
    if not is_server_running():
        start_server()
    fname =  os.path.abspath(fname)
    url = open(os.path.join(root_dir, 'flask_server.url')).read()
    url += '/structure?'
    url += urllib.urlencode({'file': fname})
    webbrowser.open(url)


class JoleculeForm(tkform.Form):
  def __init__(self, width=700, height=800, parent=None):
    tkform.Form.__init__(self, parent, width, height)
    self.title('Local Jolecule PDB Viewer')
    self.push_text("Jolecule PDB Viewer %s" % _version.__version__, 20)
    self.push_line()
    self.push_spacer()

    def ask_for_pdb():
        pdb = tkFileDialog.askopenfilename()
        self.print_output('Load {} '.format(pdb))
        open_pdb(pdb)
    self.push_button('Load PDB into browser', ask_for_pdb)

    self.push_spacer(height=1)
    self.push_output()

    url_fname = os.path.join(root_dir, 'flask_server.url')
    url = open(url_fname).read().split()[-1]
    self.print_output('Local server: ' + url)


if __name__ == "__main__":
    if len(sys.argv) == 1:
        print(__doc__)
    elif sys.argv[1] == '-i':
        form = JoleculeForm(500, 400)
        form.mainloop()
    else:
        for pdb in sys.argv[1:]:
            if not os.path.isfile(pdb):
                print("Error: '{}' file not found\n".format(pdb))
                print(__doc__)
                sys.exit(1)
        for pdb in sys.argv[1:]:
            open_pdb(pdb)
