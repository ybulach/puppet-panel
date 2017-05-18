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
.controller('ClassesCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, ApiService, NgTableParams) {
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

  // Create a class
  $scope.classes.create = function() {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/editclass.html',
      controller: 'EditClassCtrl',
      appendTo: modalParent(),
      resolve: {
        classData: {}
      }
    })

    modalInstance.result.then(function(result) {
      $location.path('/classes/' + result.name);
    });
  };
}]);
