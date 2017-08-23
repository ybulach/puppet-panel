# This file is part of puppet-panel.
#
# puppet-panel is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# puppet-panel is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with puppet-panel.  If not, see <http://www.gnu.org/licenses/>.

from django.conf import settings
from django.conf.urls import include, url
from django.contrib import admin
import django_rest_apikey.views
import djoser.views
from rest_framework_nested import routers
from rest_framework_swagger.views import get_swagger_view

import views

api_router = routers.SimpleRouter(trailing_slash=False)
api_router.register(r'apikeys', django_rest_apikey.views.APIKeyViewSet, base_name='apikeys')
api_router.register(r'users', views.UserViewSet, base_name='users')

user_router = routers.NestedSimpleRouter(api_router, r'users', lookup='user', trailing_slash=False)
user_router.register(r'apikeys', views.UserApiKeyViewSet, base_name='user-apikeys')
user_router.register(r'password', views.UserPasswordViewSet, base_name='user-password')

urlpatterns = [
	# REST API
    url(r'^api/', include(api_router.urls)),
    url(r'^api/', include(user_router.urls)),
    url(r'^api/', include('puppet.urls')),

    # API authentication (from Djoser, added here to remove trailing slashes)
    url(r'^api/login$', djoser.views.LoginView.as_view(), name='login'),
    url(r'^api/logout$', djoser.views.LogoutView.as_view(), name='logout'),
    url(r'^api/account$', djoser.views.UserView.as_view(), name='user'),
    url(r'^api/password$', djoser.views.SetPasswordView.as_view(), name='set_password'),

    # API documentation
    url(r'^doc/', get_swagger_view(title='Hosting Panel API')),
    url(r'^', include('rest_framework.urls', namespace='rest_framework')),

    # Web interface
    url(r'^config.json$', views.ConfigView.as_view(), name='config'),
    url(r'^$', views.IndexView.as_view(), name='index'),
]

# Admin is enabled in debug mode only
if settings.DEBUG:
    urlpatterns.append(url(r'^admin/', include(admin.site.urls)))
