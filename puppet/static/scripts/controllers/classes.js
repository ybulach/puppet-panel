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
