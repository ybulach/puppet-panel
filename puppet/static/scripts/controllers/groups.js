'use strict';

angular.module('puppetPanel')
.controller('GroupsCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.groups = {error: '', status: '', data: []};
  $scope.groups.table = new NgTableParams({sorting: {name: "asc"}}, {});

  // Get the groups
  $http.get(ApiService.getConfig('url') + '/groups')
  .then(function(result) {
    $scope.groups.data = result.data;
    $scope.groups.table.settings({dataset: $scope.groups.data});
  }, function(reason) {
    $scope.groups.error = 'Error while loading groups informations.';
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
    $scope.groups.status = '';
  });

  // Common modal parent
  var modalParent = function() {
    return angular.element($document[0].querySelector('.modal-parent'));
  };

  // Create a group
  $scope.groups.create = function() {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/editgroup.html',
      controller: 'EditGroupCtrl',
      appendTo: modalParent(),
      resolve: {
        groupData: {}
      }
    })

    modalInstance.result.then(function(result) {
      $location.path('/groups/' + result.name);
    });
  };
}]);
