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
.controller('UserCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$filter', '$routeParams', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, $filter, $routeParams, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.username = $routeParams.username;
  $scope.user = {error: '', data: []};
  $scope.apikeys = {error: '', success: '', status: ''};
  $scope.apikeys.table = new NgTableParams({sorting: {created_at: "asc"}}, {});

  // Checks params
  if(!$routeParams.username) {
    $location.path('/users');
    return;
  }

  // Get the user
  $http.get(ApiService.getConfig('url') + '/users/' + $routeParams.username)
  .then(function(result) {
    $scope.user.data = result.data;
    //$scope.apikeys.settings({dataset: $scope.user.data.apikeys});
  }, function(reason) {
    $scope.user.error = 'Error while loading user informations: ' + reason.statusText;
  });

  // Get the API keys
  $http.get(ApiService.getConfig('url') + '/users/' + $routeParams.username + '/apikeys')
  .then(function(result) {
    $scope.apikeys.data = result.data;
    $scope.apikeys.table.settings({dataset: $scope.apikeys.data});
  }, function(reason) {
    $scope.apikeys.error = 'Error while loading API keys.';
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
  });

  // Common modal parent
  var modalParent = function() {
    return angular.element($document[0].querySelector('.modal-parent'));
  };

  // Password edition
  $scope.user.password = function() {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/genericpassword.html',
      controller: 'GenericPasswordCtrl',
      appendTo: modalParent(),
      resolve: {
        url: function() {
          return ApiService.getConfig('url') + '/users/' + $scope.username + '/password';
        }
      }
    });
  };

  // Edit and delete the user
  $scope.user.edit = function() {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/edituser.html',
      controller: 'EditUserCtrl',
      appendTo: modalParent(),
      resolve: {
        userData: $scope.user.data
      }
    })

    modalInstance.result.then(function(result) {
      $scope.user.data = result;

      if(result.username !== $scope.username)
        $location.path('/users/' + result.username);
    });
  };

  $scope.user.delete = function() {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/genericdeletion.html',
      controller: 'GenericDeletionCtrl',
      appendTo: modalParent(),
      resolve: {
        url: function() {
          return ApiService.getConfig('url') + '/users/' + $scope.username;
        }
      }
    });

    modalInstance.result.then(function() {
      $location.path('/users');
    });
  };

  // Create and delete API keys
  $scope.apikeys.create = function () {
    $scope.apikeys.status = 'pending';
    $scope.apikeys.error = $scope.apikeys.success = '';
    ApiService.cleanErrorsInForm($scope.apikeys.form);

    $http.post(ApiService.getConfig('url') + '/users/' + $routeParams.username + '/apikeys', {email: $scope.apikeys.data.email})
    .then(function(result) {
      $scope.apikeys.data.push(result.data);
      $scope.apikeys.table.settings({dataset: $scope.apikeys.data});
      $scope.apikeys.success = 'New API key created successfully: ' + result.data.key;
    }, function(reason) {
      var error = ApiService.convertErrorsToForm(reason.data, $scope.apikeys.form);
      if(error)
        $scope.apikeys.error = 'API key creation failed: ' + error;
    });
  };

  $scope.apikeys.delete = function(key) {
    $scope.apikeys.error = $scope.apikeys.success = '';

    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/genericdeletion.html',
      controller: 'GenericDeletionCtrl',
      appendTo: modalParent(),
      resolve: {
        url: function() {
          return ApiService.getConfig('url') + '/users/' + $routeParams.username + '/apikeys/' + key;
        }
      }
    });

    modalInstance.result.then(function() {
      var filtered = $filter('filter')($scope.apikeys.data, {'key': key}, true);
      if(filtered.length)
        $scope.apikeys.data.splice($scope.apikeys.data.indexOf(filtered[0]), 1);
      $scope.apikeys.table.settings({dataset: $scope.apikeys.data});
    });
  };
}]);
