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
.controller('NodeCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$filter', '$routeParams', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, $filter, $routeParams, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.name = $routeParams.name;
  $scope.node = {error: '', data: []};
  $scope.parameters = new NgTableParams({sorting: {name: "asc"}}, {});
  $scope.reports = new NgTableParams({sorting: {start: "desc"}}, {});

  // Checks params
  if(!$routeParams.name) {
    $location.path('/nodes');
    return;
  }

  // Get the node
  $http.get(ApiService.getConfig('url') + '/nodes/' + $routeParams.name)
  .then(function(result) {
    $scope.node.data = result.data;
    $scope.parameters.settings({dataset: $scope.node.data.parameters});
    $scope.reports.settings({dataset: $scope.node.data.reports});
  }, function(reason) {
    $scope.node.error = 'Error while loading node informations: ' + reason.statusText;
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
  });

  // Common modal parent
  var modalParent = function() {
    return angular.element($document[0].querySelector('.modal-parent'));
  };

  // Edit and delete the node
  $scope.node.edit = function() {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/editnode.html',
      controller: 'EditNodeCtrl',
      appendTo: modalParent(),
      resolve: {
        nodeData: $scope.node.data,
        creation: false
      }
    })

    modalInstance.result.then(function(result) {
      $scope.node.data = result;

      if(result.name !== $scope.name)
        $location.path('/nodes/' + result.name);
    });
  };

  $scope.node.delete = function() {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/genericdeletion.html',
      controller: 'GenericDeletionCtrl',
      appendTo: modalParent(),
      resolve: {
        url: function() {
          return ApiService.getConfig('url') + '/nodes/' + $scope.name;
        }
      }
    });

    modalInstance.result.then(function() {
      $location.path('/nodes');
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
          return ApiService.getConfig('url') + '/nodes/' + $scope.name + '/parameters';
        },
        parameterData: (parameter !== undefined) ? parameter : {}
      }
    })

    modalInstance.result.then(function(result) {
      // New parameter
      if(parameter === undefined) {
        $scope.node.data.parameters.push(result);
      }
      // Edit parameter
      else {
        var filtered = $filter('filter')($scope.node.data.parameters, {'name': parameter.name}, true);
        if(filtered.length)
          angular.copy(result, $scope.node.data.parameters[$scope.node.data.parameters.indexOf(filtered[0])]);
      }

      $scope.parameters.settings({dataset: $scope.node.data.parameters});
    });
  };

  $scope.parameters.delete = function(parameter) {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/genericdeletion.html',
      controller: 'GenericDeletionCtrl',
      appendTo: modalParent(),
      resolve: {
        url: function() {
          return ApiService.getConfig('url') + '/nodes/' + $scope.name + '/parameters/' + parameter.name;
        }
      }
    });

    modalInstance.result.then(function() {
      var filtered = $filter('filter')($scope.node.data.parameters, {'name': parameter.name}, true);
      if(filtered.length) {
        $scope.node.data.parameters.splice($scope.node.data.parameters.indexOf(filtered[0]), 1);
        $scope.parameters.settings({dataset: $scope.node.data.parameters});
      }
    });
  };
}]);
