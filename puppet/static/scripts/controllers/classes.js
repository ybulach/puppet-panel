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
.controller('ClassesCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$filter', '$routeParams', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, $filter, $routeParams, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.classes = {error: '', status: '', data: []};
  $scope.classes.table = new NgTableParams({sorting: {name: "asc"}}, {});

  // Get the classes
  $http.get(ApiService.getConfig('url') + '/classes')
  .then(function(result) {
    $scope.classes.data = result.data;
    $scope.classes.table.settings({dataset: $scope.classes.data});

    // Open modal if needed
    if($routeParams.name) {
      var filtered = $filter('filter')($scope.classes.data, {'name': $routeParams.name}, true);
      if(filtered.length) {
        $scope.classes.edit(filtered[0]);
      }
    }
  }, function(reason) {
    $scope.classes.error = 'Error while loading classes informations.';
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
    $scope.classes.status = '';
  });

  // Common modal parent
  var modalParent = function() {
    return angular.element($document[0].querySelector('.modal-parent'));
  };

  // Add/edit and delete classes
  $scope.classes.edit = function(cls) {
    if(cls !== undefined) {
      $location.path('/classes/' + cls.name, false);
    }

    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/editclass.html',
      controller: 'EditClassCtrl',
      appendTo: modalParent(),
      resolve: {
        classData: (cls !== undefined) ? cls : {}
      }
    })

    modalInstance.result.then(function(result) {
      // New class
      if(cls === undefined) {
        $scope.classes.data.push(result);
      }
      // Edit class
      else {
        var filtered = $filter('filter')($scope.classes.data, {'name': cls.name}, true);
        if(filtered.length)
          angular.copy(result, $scope.classes.data[$scope.classes.data.indexOf(filtered[0])]);
      }

      $scope.classes.table.settings({dataset: $scope.classes.data});
    });

    modalInstance.closed.then(function() {
      $location.path('/classes', false);
    });
  };

  $scope.classes.delete = function(cls) {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/genericdeletion.html',
      controller: 'GenericDeletionCtrl',
      appendTo: modalParent(),
      resolve: {
        url: function() {
          return ApiService.getConfig('url') + '/classes/' + cls.name;
        }
      }
    });

    modalInstance.result.then(function() {
      var filtered = $filter('filter')($scope.classes.data, {'name': cls.name}, true);
      if(filtered.length) {
        $scope.classes.data.splice($scope.classes.data.indexOf(filtered[0]), 1);
        $scope.classes.table.settings({dataset: $scope.classes.data});
      }
    });
  };
}]);
