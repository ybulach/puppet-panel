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
