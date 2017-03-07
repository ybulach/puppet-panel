from django.views.generic.base import TemplateView

class ConfigView(TemplateView):
    template_name = 'config.json'

class IndexView(TemplateView):
    template_name = 'index.html'
