// This file is part of puppet-panel.
//
// puppet-panel is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// puppet-panel is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with puppet-panel.  If not, see <http://www.gnu.org/licenses/>.

'use strict';

angular.module('puppetPanel')
.factory('ApiInterceptor', ['$q', '$location', function($q, $location) {
  return {
    responseError: function(reason) {
      var message = '';

      // Properly logout user if "Authentication needed" received
      if((reason.status === 401) && ($location.path() !== '/login')) {
        $location.path('/logout');
      }

      // Connection failure
      if(reason.status <= 0) {
        message = 'Connection to ' + reason.config.url + ' failed';
      }

      if(message)
        reason.data = message;

      return $q.reject(reason, message);
    }
  };
}]);

angular.module('puppetPanel')
.config(['$httpProvider', function($httpProvider) {
  $httpProvider.interceptors.push('ApiInterceptor');
}]);
