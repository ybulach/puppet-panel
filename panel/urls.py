from django.conf import settings
from django.conf.urls import include, url
from django.contrib import admin
from rest_framework_swagger.views import get_swagger_view

urlpatterns = [
    url(r'^api/', include('puppet.urls')),
    url(r'^doc/', get_swagger_view(title='Hosting Panel API')),
    url(r'^', include('rest_framework.urls', namespace='rest_framework')),
]

# Admin is enabled in debug mode only
if settings.DEBUG:
    urlpatterns.append(url(r'^admin/', include(admin.site.urls)))
