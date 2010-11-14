# template.py
# Copyright (C) 2006, 2007, 2008, 2009, 2010 Michael Bayer
# mike_mp@zzzcomputing.com
#
# This module is part of Mako and is released under
# the MIT License: http://www.opensource.org/licenses/mit-license.php

"""Provides the Template class, a facade for parsing, generating and executing
template strings, as well as template runtime operations."""

from mako.lexer import Lexer
from mako import runtime, util, exceptions, codegen
import imp, os, re, shutil, stat, sys, tempfile, time, types, weakref

    
class Template(object):
    """a compiled template"""
    def __init__(self, 
                    text=None, 
                    filename=None, 
                    uri=None, 
                    format_exceptions=False, 
                    error_handler=None, 
                    lookup=None, 
                    output_encoding=None, 
                    encoding_errors='strict', 
                    module_directory=None, 
                    cache_type=None, 
                    cache_dir=None, 
                    cache_url=None, 
                    module_filename=None, 
                    input_encoding=None, 
                    disable_unicode=False, 
                    default_filters=None, 
                    buffer_filters=(), 
                    imports=None, 
                    preprocessor=None, 
                    cache_enabled=True):
        """Construct a new Template instance using either literal template
        text, or a previously loaded template module
        
        :param text: textual template source, or None if a module is to be
            provided
        
        :param uri: the uri of this template, or some identifying string.
            defaults to the full filename given, or "memory:(hex id of this
            Template)" if no filename
        
        :param filename: filename of the source template, if any
        
        :param format_exceptions: catch exceptions and format them into an
            error display template
        """
        
        if uri:
            self.module_id = re.sub(r'\W', "_", uri)
            self.uri = uri
        elif filename:
            self.module_id = re.sub(r'\W', "_", filename)
            drive, path = os.path.splitdrive(filename)
            path = os.path.normpath(path).replace(os.path.sep, "/")
            self.uri = path
        else:
            self.module_id = "memory:" + hex(id(self))
            self.uri = self.module_id
        
        self.input_encoding = input_encoding
        self.output_encoding = output_encoding
        self.encoding_errors = encoding_errors
        self.disable_unicode = disable_unicode

        if util.py3k and disable_unicode:
            raise exceptions.UnsupportedError(
                                    "Mako for Python 3 does not "
                                    "support disabling Unicode")
        
        if default_filters is None:
            if util.py3k or self.disable_unicode:
                self.default_filters = ['str']
            else:
                self.default_filters = ['unicode']
        else:
            self.default_filters = default_filters
        self.buffer_filters = buffer_filters
            
        self.imports = imports
        self.preprocessor = preprocessor
        
        # if plain text, compile code in memory only
        if text is not None:
            (code, module) = _compile_text(self, text, filename)
            self._code = code
            self._source = text
            ModuleInfo(module, None, self, filename, code, text)
        elif filename is not None:
            # if template filename and a module directory, load
            # a filesystem-based module file, generating if needed
            if module_filename is not None:
                path = module_filename
            elif module_directory is not None:
                u = self.uri
                if u[0] == '/':
                    u = u[1:]
                path = os.path.abspath(
                        os.path.join(
                            os.path.normpath(module_directory), 
                            os.path.normpath(u) + ".py"
                            )
                        )
            else:
                path = None
                
            module = self._compile_from_file(path, filename)
        else:
            raise exceptions.RuntimeException(
                                "Template requires text or filename")

        self.module = module
        self.filename = filename
        self.callable_ = self.module.render_body
        self.format_exceptions = format_exceptions
        self.error_handler = error_handler
        self.lookup = lookup
        self.cache_type = cache_type
        self.cache_dir = cache_dir
        self.cache_url = cache_url
        self.cache_enabled = cache_enabled
    
    def _compile_from_file(self, path, filename):
        if path is not None:
            util.verify_directory(os.path.dirname(path))
            filemtime = os.stat(filename)[stat.ST_MTIME]
            if not os.path.exists(path) or \
                        os.stat(path)[stat.ST_MTIME] < filemtime:
                _compile_module_file(
                            self, 
                            open(filename, 'rb').read(), 
                            filename, 
                            path)
            module = imp.load_source(self.module_id, path, open(path, 'rb'))
            del sys.modules[self.module_id]
            if module._magic_number != codegen.MAGIC_NUMBER:
                _compile_module_file(
                            self, 
                            open(filename, 'rb').read(), 
                            filename, 
                            path)
                module = imp.load_source(self.module_id, path, open(path, 'rb'))
                del sys.modules[self.module_id]
            ModuleInfo(module, path, self, filename, None, None)
        else:
            # template filename and no module directory, compile code
            # in memory
            code, module = _compile_text(
                                self, 
                                open(filename, 'rb').read(), 
                                filename)
            self._source = None
            self._code = code
            ModuleInfo(module, None, self, filename, code, None)
        return module
    @property
    def source(self):
        """return the template source code for this Template."""
        
        return _get_module_info_from_callable(self.callable_).source

    @property
    def code(self):
        """return the module source code for this Template"""
        
        return _get_module_info_from_callable(self.callable_).code
    
    @property
    def cache(self):
        return self.module._template_cache
    
    def render(self, *args, **data):
        """Render the output of this template as a string.
        
        if the template specifies an output encoding, the string will be
        encoded accordingly, else the output is raw (raw output uses cStringIO
        and can't handle multibyte characters). a Context object is created
        corresponding to the given data. Arguments that are explictly declared
        by this template's internal rendering method are also pulled from the
        given \*args, \**data members.
        
        """
        return runtime._render(self, self.callable_, args, data)
    
    def render_unicode(self, *args, **data):
        """render the output of this template as a unicode object."""
        
        return runtime._render(self, 
                                self.callable_, 
                                args, 
                                data, 
                                as_unicode=True)
        
    def render_context(self, context, *args, **kwargs):
        """Render this Template with the given context.  
        
        the data is written to the context's buffer.
        
        """
        if getattr(context, '_with_template', None) is None:
            context._with_template = self
        runtime._render_context(self, 
                                self.callable_, 
                                context, 
                                *args, 
                                **kwargs)
    
    def has_def(self, name):
        return hasattr(self.module, "render_%s" % name)
        
    def get_def(self, name):
        """Return a def of this template as a DefTemplate."""
        
        return DefTemplate(self, getattr(self.module, "render_%s" % name))

    def _get_def_callable(self, name):
        return getattr(self.module, "render_%s" % name)
    
    @property
    def last_modified(self): 
        return self.module._modified_time    
    
class ModuleTemplate(Template):
    """A Template which is constructed given an existing Python module.
    
        e.g.::
        
        t = Template("this is a template")
        f = file("mymodule.py", "w")
        f.write(t.code)
        f.close()
        
        import mymodule
        
        t = ModuleTemplate(mymodule)
        print t.render()
    
    """
    
    def __init__(self, module, 
                        module_filename=None, 
                        template=None, 
                        template_filename=None, 
                        module_source=None, 
                        template_source=None,
                        output_encoding=None, 
                        encoding_errors='strict',
                        disable_unicode=False, 
                        format_exceptions=False,
                        error_handler=None, 
                        lookup=None, 
                        cache_type=None,
                        cache_dir=None, 
                        cache_url=None, 
                        cache_enabled=True
    ):
        self.module_id = re.sub(r'\W', "_", module._template_uri)
        self.uri = module._template_uri
        self.input_encoding = module._source_encoding
        self.output_encoding = output_encoding
        self.encoding_errors = encoding_errors
        self.disable_unicode = disable_unicode
        self.module = module
        self.filename = template_filename
        ModuleInfo(module, 
                        module_filename, 
                        self, 
                        template_filename, 
                        module_source, 
                        template_source)
        
        self.callable_ = self.module.render_body
        self.format_exceptions = format_exceptions
        self.error_handler = error_handler
        self.lookup = lookup
        self.cache_type = cache_type
        self.cache_dir = cache_dir
        self.cache_url = cache_url
        self.cache_enabled = cache_enabled
        
class DefTemplate(Template):
    """a Template which represents a callable def in a parent template."""
    
    def __init__(self, parent, callable_):
        self.parent = parent
        self.callable_ = callable_
        self.output_encoding = parent.output_encoding
        self.module = parent.module
        self.encoding_errors = parent.encoding_errors
        self.format_exceptions = parent.format_exceptions
        self.error_handler = parent.error_handler
        self.lookup = parent.lookup

    def get_def(self, name):
        return self.parent.get_def(name)

class ModuleInfo(object):
    """Stores information about a module currently loaded into memory,
    provides reverse lookups of template source, module source code based on
    a module's identifier.
    
    """
    _modules = weakref.WeakValueDictionary()

    def __init__(self, 
                    module, 
                    module_filename, 
                    template, 
                    template_filename, 
                    module_source, 
                    template_source):
        self.module = module
        self.module_filename = module_filename
        self.template_filename = template_filename
        self.module_source = module_source
        self.template_source = template_source
        self._modules[module.__name__] = template._mmarker = self
        if module_filename:
            self._modules[module_filename] = self
    
    @property
    def code(self):
        if self.module_source is not None:
            return self.module_source
        else:
            return open(self.module_filename).read()
    
    @property
    def source(self):
        if self.template_source is not None:
            if self.module._source_encoding and \
                    not isinstance(self.template_source, unicode):
                return self.template_source.decode(
                                self.module._source_encoding)
            else:
                return self.template_source
        else:
            if self.module._source_encoding:
                return open(self.template_filename, 'rb').read().\
                                decode(self.module._source_encoding)
            else:
                return open(self.template_filename).read()
        
def _compile_text(template, text, filename):
    identifier = template.module_id
    lexer = Lexer(text, 
                    filename, 
                    disable_unicode=template.disable_unicode,
                    input_encoding=template.input_encoding,
                    preprocessor=template.preprocessor)
    node = lexer.parse()
    
    source = codegen.compile(node, 
                            template.uri, 
                            filename,
                            default_filters=template.default_filters,
                            buffer_filters=template.buffer_filters, 
                            imports=template.imports, 
                            source_encoding=lexer.encoding,
                            generate_magic_comment=template.disable_unicode,
                            disable_unicode=template.disable_unicode)

    cid = identifier
    if not util.py3k and isinstance(cid, unicode):
        cid = cid.encode()
    module = types.ModuleType(cid)
    code = compile(source, cid, 'exec')
    exec code in module.__dict__, module.__dict__
    return (source, module)

def _compile_module_file(template, text, filename, outputpath):
    identifier = template.module_id
    lexer = Lexer(text, 
                    filename, 
                    disable_unicode=template.disable_unicode,
                    input_encoding=template.input_encoding,
                    preprocessor=template.preprocessor)
                    
    node = lexer.parse()
    source = codegen.compile(node, 
                                template.uri, 
                                filename,
                                default_filters=template.default_filters,
                                buffer_filters=template.buffer_filters,
                                imports=template.imports,
                                source_encoding=lexer.encoding,
                                generate_magic_comment=True,
                                disable_unicode=template.disable_unicode)
                                
    # make tempfiles in the same location as the ultimate 
    # location.   this ensures they're on the same filesystem,
    # avoiding synchronization issues.
    (dest, name) = tempfile.mkstemp(dir=os.path.dirname(outputpath))
    
    if isinstance(source, unicode):
        source = source.encode(lexer.encoding or 'ascii')
        
    os.write(dest, source)
    os.close(dest)
    shutil.move(name, outputpath)

def _get_module_info_from_callable(callable_):
    return _get_module_info(callable_.func_globals['__name__'])
    
def _get_module_info(filename):
    return ModuleInfo._modules[filename]
        
