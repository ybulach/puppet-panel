'use strict';

angular.module('puppetPanel')
.controller('NodesCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$interval', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, $interval, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.nodes = {error: '', lastrefresh: null, data: []};
  $scope.nodes.table = new NgTableParams({sorting: {name: "asc"}}, {});

  $scope.orphans = {error: '', lastrefresh: null, data: []};
  $scope.orphans.table = new NgTableParams({sorting: {name: "asc"}}, {});

  // Get the nodes and orphans
  var refresh = function() {
    $scope.nodes.error = '';
    $scope.orphans.error = '';
    var page_nodes = $scope.nodes.table.page();
    var page_orphans = $scope.orphans.table.page();

    $http.get(ApiService.getConfig('url') + '/nodes')
    .then(function(result) {
      $scope.nodes.data = result.data;
      $scope.nodes.table.settings({dataset: $scope.nodes.data});
      $scope.nodes.table.page(page_nodes);
      $scope.nodes.lastrefresh = Date.now();
    }, function(reason) {
      $scope.nodes.error = 'Error while loading nodes informations.';
    });

    $http.get(ApiService.getConfig('url') + '/orphans')
    .then(function(result) {
      $scope.orphans.data = result.data;
      $scope.orphans.table.settings({dataset: $scope.orphans.data});
      $scope.orphans.table.page(page_orphans);
      $scope.orphans.lastrefresh = Date.now();
    }, function(reason) {
      $scope.orphans.error = 'Error while loading orphan nodes informations.';
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
        nodeData: {},
        creation: true
      }
    })

    modalInstance.result.then(function(result) {
      $location.path('/nodes/' + result.name);
    });
  };

  // Manage orphan nodes
  $scope.orphans.create = function(node) {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/editnode.html',
      controller: 'EditNodeCtrl',
      appendTo: modalParent(),
      resolve: {
        nodeData: {name: node},
        creation: true
      }
    })

    modalInstance.result.then(function(result) {
      $location.path('/nodes/' + result.name);
    });
  };

  $scope.orphans.delete = function(node) {
    // TODO
  };
}]);
