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
.controller('GroupCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$filter', '$routeParams', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, $filter, $routeParams, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.name = $routeParams.name;
  $scope.group = {error: '', data: []};
  $scope.parameters = new NgTableParams({sorting: {name: "asc"}}, {});

  // Checks params
  if(!$routeParams.name) {
    $location.path('/groups');
    return;
  }

  // Get the group
  $http.get(ApiService.getConfig('url') + '/groups/' + $routeParams.name)
  .then(function(result) {
    $scope.group.data = result.data;
    $scope.parameters.settings({dataset: $scope.group.data.parameters});
  }, function(reason) {
    $scope.group.error = 'Error while loading group informations: ' + reason.statusText;
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
  });

  // Common modal parent
  var modalParent = function() {
    return angular.element($document[0].querySelector('.modal-parent'));
  };

  // Edit and delete the group
  $scope.group.edit = function() {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/editgroup.html',
      controller: 'EditGroupCtrl',
      appendTo: modalParent(),
      resolve: {
        groupData: $scope.group.data
      }
    })

    modalInstance.result.then(function(result) {
      $scope.group.data = result;

      if(result.name !== $scope.name)
        $location.path('/groups/' + result.name);
    });
  };

  $scope.group.delete = function() {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/genericdeletion.html',
      controller: 'GenericDeletionCtrl',
      appendTo: modalParent(),
      resolve: {
        url: function() {
          return ApiService.getConfig('url') + '/groups/' + $scope.name;
        }
      }
    });

    modalInstance.result.then(function() {
      $location.path('/groups');
    });
  };

  // Add/edit and delete parameters
  $scope.parameters.edit = function(parameter) {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/editparameter.html',
      controller: 'EditParameterCtrl',
      appendTo: modalParent(),
      resolve: {
        base_url: function() {
          return ApiService.getConfig('url') + '/groups/' + $scope.name + '/parameters';
        },
        parameterData: (parameter !== undefined) ? parameter : {}
      }
    })

    modalInstance.result.then(function(result) {
      // New parameter
      if(parameter === undefined) {
        $scope.group.data.parameters.push(result);
      }
      // Edit parameter
      else {
        var filtered = $filter('filter')($scope.group.data.parameters, {'name': parameter.name}, true);
        if(filtered.length)
          angular.copy(result, $scope.group.data.parameters[$scope.group.data.parameters.indexOf(filtered[0])]);
      }

      $scope.parameters.settings({dataset: $scope.group.data.parameters});
    });
  };

  $scope.parameters.delete = function(parameter) {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/genericdeletion.html',
      controller: 'GenericDeletionCtrl',
      appendTo: modalParent(),
      resolve: {
        url: function() {
          return ApiService.getConfig('url') + '/groups/' + $scope.name + '/parameters/' + parameter.name;
        }
      }
    });

    modalInstance.result.then(function() {
      var filtered = $filter('filter')($scope.group.data.parameters, {'name': parameter.name}, true);
      if(filtered.length) {
        $scope.group.data.parameters.splice($scope.group.data.parameters.indexOf(filtered[0]), 1);
        $scope.parameters.settings({dataset: $scope.group.data.parameters});
      }
    });
  };
}]);
