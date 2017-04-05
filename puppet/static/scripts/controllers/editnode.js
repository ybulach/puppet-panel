'use strict';

angular.module('puppetPanel')
.controller('EditNodeCtrl', ['$scope', '$uibModalInstance', '$http', 'ApiService', 'nodeData', 'creation', function($scope, $uibModalInstance, $http, ApiService, nodeData, creation) {
  var initialName = nodeData.name;
  $scope.node = angular.copy(nodeData);
  $scope.classes = [];
  $scope.groups = [];
  $scope.status = '';
  $scope.error = '';

  // Get classes
  $http.get(ApiService.getConfig('url') + '/classes').then(function(result) {
    $scope.classes = [];
    result.data.forEach(function(item) {
      $scope.classes.push(item.name);
    });
  }, function(reason) {
    $scope.classes = ['List unavailable'];
    $scope.status = 'error';
    $scope.error += 'Can\'t get the list of classes. Refresh this form if you want to select one.';
  });

  // Get groups
  $http.get(ApiService.getConfig('url') + '/groups').then(function(result) {
    $scope.groups = [];
    result.data.forEach(function(item) {
      $scope.groups.push(item.name);
    });
  }, function(reason) {
    $scope.groups = ['List unavailable'];
    $scope.status = 'error';
    $scope.error += 'Can\'t get the list of groups. Refresh this form if you want to select one.';
  });

  $scope.ok = function () {
    $scope.status = 'pending';
    ApiService.cleanErrorsInForm($scope.form);

    // Create new node
    if((initialName === undefined) || creation) {
      $http.post(ApiService.getConfig('url') + '/nodes', $scope.node)
      .then(function(result) {
        $uibModalInstance.close(result.data);
      }, function(reason) {
        $scope.status = 'error';
        $scope.error = ApiService.convertErrorsToForm(reason.data, $scope.form);
      });
    }
    // Update existing node
    else {
      $http.put(ApiService.getConfig('url') + '/nodes/' + initialName, $scope.node)
      .then(function(result) {
        $uibModalInstance.close(result.data);
      }, function(reason) {
        $scope.status = 'error';
        $scope.error = ApiService.convertErrorsToForm(reason.data, $scope.form);
      });
    }
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
}]);
