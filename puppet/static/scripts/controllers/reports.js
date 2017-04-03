'use strict';

angular.module('puppetPanel')
.controller('ReportsCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$interval', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, $interval, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.reports = {error: '', date: Date.now(), lastrefresh: null, data: []};
  $scope.reports.table = new NgTableParams({sorting: {start: "desc"}}, {});

  // Get the reports
  var refresh = function() {
    $scope.reports.error = '';
    var page_reports = $scope.reports.table.page();

    $http.get(ApiService.getConfig('url') + '/reports')
    .then(function(result) {
      $scope.reports.data = result.data;
      $scope.reports.table.settings({dataset: $scope.reports.data});
      $scope.reports.table.page(page_reports);
      $scope.reports.lastrefresh = Date.now();
    }, function(reason) {
      $scope.reports.error = 'Error while loading reports informations.';
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
}]);
