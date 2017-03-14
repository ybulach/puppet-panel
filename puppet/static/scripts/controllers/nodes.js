'use strict';

angular.module('puppetPanel')
.controller('NodesCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$interval', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, $interval, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.nodes = {error: '', data: []};
  $scope.nodes.table = new NgTableParams({sorting: {name: "asc"}}, {});

  // Get the nodes
  var refresh = function() {
    $scope.nodes.error = '';
    var page = $scope.nodes.table.page();

    $http.get(ApiService.getConfig('url') + '/nodes')
    .then(function(result) {
      $scope.nodes.data = result.data;
      $scope.nodes.table.settings({dataset: $scope.nodes.data});
      $scope.nodes.table.page(page);
    }, function(reason) {
      $scope.nodes.error = 'Error while loading nodes informations.';
    });
  };
  refresh();

  // Autorefresh
  var autorefresh = $interval(function() {
    refresh();
  }, 1000 * 15);

  $scope.$on("$destroy", function() {
    $interval.cancel(autorefresh);
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
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
