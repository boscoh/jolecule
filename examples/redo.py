import os, glob
fs = glob.glob('*pdb')
for f in fs:
	cmd = 'cp ../dist/jole*js ../dist/*css ' + f.replace('.pdb', '') + '-jol'
	cmd = 'jol-static.js ' + f
	print cmd
	os.system(cmd)
