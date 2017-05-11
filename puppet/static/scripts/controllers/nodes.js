'use strict';

angular.module('puppetPanel')
.controller('NodesCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$interval', '$filter', 'ApiService', 'NgTableParams', 'ngTableEventsChannel', function($scope, $location, $uibModal, $http, $document, $interval, $filter, ApiService, NgTableParams, ngTableEventsChannel) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.nodes = {error: '', lastrefresh: null, data: []};
  $scope.nodes.table = new NgTableParams({
    sorting: {name: 'asc'},
    filter: {
      status: $location.search().status
    }
  }, {});

  $scope.orphans = {error: '', lastrefresh: null, data: []};
  $scope.orphans.table = new NgTableParams({sorting: {name: "asc"}}, {});

  // A list of filters for the status column
  $scope.statuses = ApiService.statuses;

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

  // Update search part of URL when filtering the table
  ngTableEventsChannel.onAfterDataFiltered(function(table) {
    $location.search('status', table.filter().status);
  }, $scope.nodes.table);

  $scope.$on('$routeUpdate', function() {
    $scope.nodes.table.filter({
      status: $location.search().status
    });
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
        nodeData: {name: node.name},
        creation: true
      }
    })

    modalInstance.result.then(function(result) {
      $location.path('/nodes/' + result.name);
    });
  };

  $scope.orphans.delete = function(node) {
    var modalInstance = $uibModal.open({
      templateUrl: 'static/views/genericdeletion.html',
      controller: 'GenericDeletionCtrl',
      appendTo: modalParent(),
      resolve: {
        url: function() {
          return ApiService.getConfig('url') + '/orphans/' + node.name;
        }
      }
    });

    modalInstance.result.then(function() {
      var page = $scope.orphans.table.page();

      var filtered = $filter('filter')($scope.orphans.data, {'name': node.name}, true);
      if(filtered.length)
        $scope.orphans.data.splice($scope.orphans.data.indexOf(filtered[0]), 1);

      $scope.orphans.table.settings({dataset: $scope.orphans.data});
      $scope.orphans.table.page(page);
    });
  };
}]);
