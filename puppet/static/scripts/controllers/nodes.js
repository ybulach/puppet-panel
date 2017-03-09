'use strict';

angular.module('puppetPanel')
.controller('NodesCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.nodes = {error: '', success: '', status: '', data: []};
  $scope.nodes.table = new NgTableParams({sorting: {name: "asc"}}, {});

  // Get the nodes
  $http.get(ApiService.getConfig('url') + '/nodes')
  .then(function(result) {
    $scope.nodes.data = result.data;
    $scope.nodes.table.settings({dataset: $scope.nodes.data});
  }, function(reason) {
    $scope.nodes.error = 'Error while loading nodes informations.';
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
    $scope.nodes.status = '';
  });

  // Common modal parent
  var modalParent = function() {
    return angular.element($document[0].querySelector('.modal-parent'));
  };

  // Create a node
  $scope.nodes.create = function() {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/editnode.html',
      controller: 'EditNodeCtrl',
      appendTo: modalParent(),
      resolve: {
        nodeData: {}
      }
    })

    modalInstance.result.then(function(result) {
      $location.path('/nodes/' + result.name);
    });
  };
}]);
