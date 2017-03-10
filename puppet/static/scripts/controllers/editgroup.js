'use strict';

angular.module('puppetPanel')
.controller('EditGroupCtrl', ['$scope', '$uibModalInstance', '$http', 'ApiService', 'groupData', function($scope, $uibModalInstance, $http, ApiService, groupData) {
  var initialName = groupData.name;
  $scope.group = angular.copy(groupData);
  $scope.classes = [];
  $scope.parents = [];
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

  // Get parents
  $http.get(ApiService.getConfig('url') + '/groups').then(function(result) {
    $scope.parents = [];
    result.data.forEach(function(item) {
      if(item.name != initialName)
        $scope.parents.push(item.name);
    });
  }, function(reason) {
    $scope.parents = ['List unavailable'];
    $scope.status = 'error';
    $scope.error += 'Can\'t get the list of parents. Refresh this form if you want to select one.';
  });

  $scope.ok = function () {
    $scope.status = 'pending';
    ApiService.cleanErrorsInForm($scope.form);

    // Create new group
    if(initialName === undefined) {
      $http.post(ApiService.getConfig('url') + '/groups', $scope.group)
      .then(function(result) {
        $uibModalInstance.close(result.data);
      }, function(reason) {
        $scope.status = 'error';
        $scope.error = ApiService.convertErrorsToForm(reason.data, $scope.form);
      });
    }
    // Update existing group
    else {
      $http.put(ApiService.getConfig('url') + '/groups/' + initialName, $scope.group)
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
