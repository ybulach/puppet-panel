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
.factory('ApiService', ['$http', '$q', 'localStorageService', '$log', function($http, $q, localStorageService, $log) {
  var config = localStorageService.get('config');
  var user = {};

  // Keep the token in local storage
  var _save = function() {
    localStorageService.set('authentication', $http.defaults.headers.common.Authorization);
    localStorageService.set('user', user);
  };

  // Is the user logged in yet
  var loggedIn = function() {
    return ($http.defaults.headers.common.Authorization !== undefined);
  };

  // The datas of the logged in user
  var loggedUser = function() {
    return user.username;
  };

  // Get a configuration variable (from config.json)
  var getConfig = function(variable) {
    return config[variable];
  };

  // Login with specifed credentials
  var login = function(login, password) {
    return $http.post(config.url + '/login', {username: login, password: password})
      .then(function(result) {
        $http.defaults.headers.common.Authorization = 'Token ' + result.data.auth_token;

        return $http.get(config.url + '/account')
        .then(function(result) {
          // Successfuly got user data
          user = result.data;
          _save();

          return $q.when(result.data);
        }, function(reason) {
          // Getting user data failed
          $http.defaults.headers.common.Authorization = undefined;
          user = {};
          _save();

          return $q.reject(reason);
        });
      }, function(reason) {
        return $q.reject(reason);
      });
  };

  // Logout
  var logout = function() {
    return $http.post(config.url + '/logout')
    .then(function(result) {
      // Successfuly logged out
      $http.defaults.headers.common.Authorization = undefined;
      user = {};
      _save();

      return $q.when(result);
    }, function(reason) {
      // Already logged out
      if((reason.status === 401) || (reason.status === 0)) {
        $http.defaults.headers.common.Authorization = undefined;
        user = {};
        _save();

        return $q.when(reason);
      }

      // An error occurred
      return $q.reject(reason);
    });
  };

  // Convert errors to highlight form fields
  var convertErrorsToForm = function(errors, form) {
    // Field names and errors are provided in an object
    if(errors instanceof Object) {
      if(form) {
        var error;
        for(var field in errors) {
          // Field must exist in the form (and have the same name)
          if(field in form) {
            error = errors[field];
            form[field].error = ((error instanceof Array) && (error.length > 0)) ? error[0] : error;

            delete errors[field];
          }
        }
      }

      if(("non_field_errors" in errors) && (errors["non_field_errors"].length > 0))
        errors = errors["non_field_errors"][0];
      else if("detail" in errors)
        errors = errors["detail"];
      else if(Object.keys(errors).length == 0)
        errors = '';
    }

    return errors;
  };

  // Clean a form of shown errors
  var cleanErrorsInForm = function(form) {
    for(var field in form) {
      // Ignore non-fields
      if(field.startsWith('$'))
        continue

      if(form[field] instanceof Object)
        form[field].error = '';
    }
  };

  // A list of filters of nodes and reports
  var statuses = function() {
    return [
      {id: 'unchanged', title: 'Success'},
      {id: 'failed', title: 'Failed'},
      {id: 'changed', title: 'Changed'},
      {id: 'unreported', title: 'Unreported'},
      {id: 'unknown', title: 'Unknown'}
    ];
  };

  // Temporary get the config from local storage
  if(localStorageService.get('authentication') !== null) {
    $http.defaults.headers.common.Authorization = localStorageService.get('authentication');
  }

  // Get the logged in user from local storage
  if(localStorageService.get('user') !== null) {
    user = localStorageService.get('user');
  }

  // Re-load the configuration
  $http.get('config.json')
    .then(function(success) {
      config = success.data;
      localStorageService.set('config', config);
    }, function(error) {
      $log.log('Can\'t load config.json !');
    });

  // Public functions
  return {
    loggedIn: loggedIn,
    loggedUser: loggedUser,
    login: login,
    logout: logout,
    getConfig: getConfig,
    convertErrorsToForm: convertErrorsToForm,
    cleanErrorsInForm: cleanErrorsInForm,
    statuses: statuses
  };
}]);
