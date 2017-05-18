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
.controller('ClassCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$filter', '$routeParams', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, $filter, $routeParams, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.name = $routeParams.name;
  $scope.class = {error: '', data: []};

  // Checks params
  if(!$routeParams.name) {
    $location.path('/classes');
    return;
  }

  // Get the class
  $http.get(ApiService.getConfig('url') + '/classes/' + $routeParams.name)
  .then(function(result) {
    $scope.class.data = result.data;
  }, function(reason) {
    $scope.class.error = 'Error while loading class informations: ' + reason.statusText;
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
  });

  // Common modal parent
  var modalParent = function() {
    return angular.element($document[0].querySelector('.modal-parent'));
  };

  // Edit and delete the class
  $scope.class.edit = function() {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/editclass.html',
      controller: 'EditClassCtrl',
      appendTo: modalParent(),
      resolve: {
        classData: $scope.class.data
      }
    })

    modalInstance.result.then(function(result) {
      $scope.class.data = result;

      if(result.name !== $scope.name)
        $location.path('/classes/' + result.name);
    });
  };

  $scope.class.delete = function() {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/genericdeletion.html',
      controller: 'GenericDeletionCtrl',
      appendTo: modalParent(),
      resolve: {
        url: function() {
          return ApiService.getConfig('url') + '/classes/' + $scope.name;
        }
      }
    });

    modalInstance.result.then(function() {
      $location.path('/classes');
    });
  };
}]);
