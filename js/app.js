'use strict';

function getDomain(url) {
    var re = /^https{0,}:\/\/\w+\.(\w+)\.\w+/i;
    if (url !== '#') {
        return url.match(re)[1].toLowerCase();
    } else {
        return 'empty';
    }
}

angular.module('BangumiList', ['ieFix', 'ipCookie'])
.controller('ListController', ['$scope', '$http', 'ipCookie', function($scope, $http, ipCookie) {
    var dateNow, weekDayNow, yearNow, monthNow;
    var i = 0, l = 0;

    $scope.ipCookie = ipCookie;
    $scope.navList = [
        {name: '周一', index: 1, order: 'cn'},
        {name: '周二', index: 2, order: 'cn'},
        {name: '周三', index: 3, order: 'cn'},
        {name: '周四', index: 4, order: 'cn'},
        {name: '周五', index: 5, order: 'cn'},
        {name: '周六', index: 6, order: 'cn'},
        {name: '周日', index: 0, order: 'cn'},
        {name: '全部', index: -1, order: 'jp'}
    ];
    $scope.siteList = [
        {name: 'A站', domain: 'acfun', show: true}, 
        {name: 'B站', domain: 'bilibili', show: true}, 
        {name: '搜狐', domain: 'sohu', show: true}, 
        {name: '优酷', domain: 'youku', show: true}, 
        {name: '腾讯', domain: 'qq', show: true},
        {name: '爱奇艺', domain: 'iqiyi', show: true},
        {name: '乐视', domain: 'letv', show: true},
        {name: 'PPTV', domain: 'pptv', show: true},
        {name: '土豆', domain: 'tudou', show: true},
        {name: '迅雷', domain: 'movie', show: true}
    ];

    //searching query
    $scope.query = {
        'nextDayTime': 24,
        'weekDayCN': -1,
        'titleCN': '',
        'newBgm': false
    };

    //app settings
    $scope.setting = {
        'nextTimeMax': 24,   
        'nextTimeMin': 20,
        'linkTarget': '_self',
        'showAll': false,
        'newTab': false,
        'showNew': false
    };

    //app status
    $scope.status = {
        'nextDayTime': '',
        'error': false,
        'errorMsg': '',
        'reversed': true,
        'ordered': 'cn',
        'status.lastModifieded': '',
        'selectAll': true,
        'shadow': false,
        'menu': {
            'archive': false,
            'display': false,
            'sites': false
        }
    };

    //change link target
    $scope.changeTarget = function() {
        if($scope.setting.newTab) {
            $scope.status.linkTarget = '_blank';
        } else {
            $scope.status.linkTarget = '_self';
        }
        ipCookie('newTab', $scope.setting.newTab, {expires: 365});
    };

    //clear all cookie
    $scope.clearCookie = function() {
        var keys = document.cookie.match(/[^ =;]+(?=\=)/g);
        if (keys) {
            for (i = 0, l = keys.length; i < l; i++) {
                ipCookie.remove(keys[i]);
            }
            $scope.query.nextDayTime = 24;
            $scope.checkNextDayTimeFlag();
            $scope.query.newBgm = false;
            $scope.allOnly = false;
            for(i = 0, l = $scope.siteList.length; i < l; i++) {
                $scope.siteList[i].show = true;
            }
            $scope.checkSiteList();
            $scope.setting.newTab = false;
            $scope.changeTarget();
        }
    };

    //handle link click event
    $scope.linkHandler = function(site, event) {
        if(site === "#") {
            if(event.preventDefault) {
                event.preventDefault();
            } else {
                event.returnValue = false;
            }
        }
    };

    //change back to init weekDayCN
    $scope.resumeSearch = function() {
        $scope.query.titleCN = '';
        if (!$scope.allOnly && !$scope.setting.showAll) {
            $scope.query.weekDayCN = weekDayNow;
        }
    };

    //handle search input event
    $scope.searchHandler = function(event) {
        if ($scope.query.weekDayCN !== -1) {
            $scope.query.weekDayCN = -1;
        }
        if(event.keyCode === 27 || (event.keyCode === 8 && event.target.value.length <= 1)) {
            $scope.resumeSearch();
        }
    };
    
    //handel switch event
    $scope.switcherHandler = function(index, order) {
        $scope.query.titleCN = '';
        $scope.query.weekDayCN = index;
        $scope.order($scope.bangumis, order, false);
        if(index === -1) {
            $scope.setting.showAll = true;
        } else {
            $scope.setting.showAll = false;
        }
    };

    //filter bangumi data
    $scope.bgmFilter = function(item) {
        var flag = false;
        if ($scope.query.weekDayCN === -1 ) {
            flag = true;
        } else if ((item.weekDayCN === $scope.query.weekDayCN && 
                    +item.timeCN.slice(0, 2) < $scope.query.nextDayTime) || 
                  ((item.weekDayCN === 6 ? 0 : item.weekDayCN + 1) === $scope.query.weekDayCN && 
                   +item.timeCN.slice(0,2) >= $scope.query.nextDayTime)) {
            flag = true;
        } 
        if ($scope.query.newBgm && item.newBgm === false) {
            flag = false;
        }
        if ($scope.query.titleCN) {
            var re = new RegExp($scope.query.titleCN, 'i');
            if (!re.test(item.titleCN)) {
                flag = false;
            }
        }
        return flag;
    };

    //to handle hour selecter
    $scope.hourSelectHandler = function(flag) {
       if (flag === '+') {
           $scope.query.nextDayTime = ($scope.query.nextDayTime === $scope.setting.nextTimeMax ? $scope.setting.nextTimeMax : $scope.query.nextDayTime + 1);
           $scope.checkNextDayTimeFlag();
       } else if (flag === '-') {
           $scope.query.nextDayTime = ($scope.query.nextDayTime === $scope.setting.nextTimeMin ? $scope.setting.nextTimeMin : $scope.query.nextDayTime - 1);
           $scope.checkNextDayTimeFlag();
       }
       ipCookie('nextDayTime', $scope.query.nextDayTime, {expires:365});
    };

    //to check status.nextDayTime
    $scope.checkNextDayTimeFlag = function() {
        if ($scope.query.nextDayTime === $scope.setting.nextTimeMax) {
            $scope.status.nextDayTime = 'max';
        } else if ($scope.query.nextDayTime === $scope.setting.nextTimeMin) { 
            $scope.status.nextDayTime = 'min';
        } else {
            $scope.status.nextDayTime = '';
        }
    };

    //use cookie to change siteList
    $scope.getSiteCookie = function(siteList) {
        return siteList.map(function(site) {
            var value = ipCookie(site.domain);
            if (value !== undefined) {
                site.show = value;
            }
           return site; 
        });
    };
    
    //site switch
    $scope.switchSite = function(domain, show) {
        ipCookie(domain, show, {expires: 365});
        $scope.checkSiteList();
    };

    //setting.showNew switch
    $scope.switchNewOnly = function() {
        $scope.query.newBgm = $scope.setting.showNew;
        ipCookie('showNew', $scope.query.newBgm, {expires: 365});
    };

    //allOnly switch
    $scope.switchAllOnly = function() {
        if ($scope.allOnly) {
            $scope.query.weekDayCN = -1;
            $scope.order($scope.bangumis, 'jp', false);
        } else {
            $scope.query.weekDayCN = weekDayNow;
            $scope.order($scope.bangumis, 'cn', false);
        }
        ipCookie('allOnly', $scope.allOnly, {expires: 365});
    };
    
    //handle archive file button
    $scope.archiveHandler = function(year, month) {
        $scope.readBgm($scope.getJsonPath(year, month, $scope.archive), 'jp', false);
        $scope.query.weekDayCN = -1;
        $scope.setting.showAll = true;
    };

    //handle status.shadow layer
    $scope.status.shadowHandler = function() {
        $scope.status.menu.archive = false;
        $scope.status.menu.display = false;
        $scope.status.menu.display = false;
        $scope.status.shadow = false;
    };

    //handle top bar menu button
    $scope.topMenuHandler = function(menuName, flag) {
        $scope.status.menu[menuName] = !$scope.status.menu[menuName];
        if(!flag) {
            $scope.status.shadow = !$scope.status.shadow;
        }
    };

    //check if all bangumi's show is true
    $scope.checkSiteList = function() {
        for(i = 0, l = $scope.siteList.length; i < l; i++) {
            if($scope.siteList[i].show === false) {
                $scope.status.selectAll = true;
                break;
            }
            $scope.status.selectAll = false;
        }
    };
    
    //for select all button
    $scope.selectAll = function(flag) {
        for(i = 0, l = $scope.siteList.length; i < l; i++) {
           $scope.siteList[i].show = flag; 
           ipCookie($scope.siteList[i].domain,$scope.siteList[i].show,{expires:365});
        }
        $scope.status.selectAll = !$scope.status.selectAll;
    };

    //order bangumi list
    $scope.order = function(items, target, reverseFlag) {
        var weekDay = 'weekDay' + target.toUpperCase(),
        time = 'time' + target.toUpperCase();

        $scope.status.reversed = !reverseFlag;
        $scope.status.ordered = target;
        reverseFlag = reverseFlag ? -1 : 1;

        return items.sort(function(a, b) {
            if (a[weekDay] === b[weekDay]) {
                if (a[time] === '') {
                    return reverseFlag * -1;
                } else if (b[time] === '') {
                    return reverseFlag * 1;
                } else {
                    return reverseFlag * (a[time] - b[time]);
                }
            } else {
                return reverseFlag * (a[weekDay] - b[weekDay]);
                //return reverseFlag * ((a[weekDay] === 0 ? 7 : a[weekDay]) - (b[weekDay] === 0 ? 7 : b[weekDay]));
            }
        });
    };

    //turn current month to bangumi season
    $scope.monthToSeason = function(month) {
        switch (true) {
            case (month < 4):
                return 1;
            case (month < 7):
                return 4;
            case (month < 10):
                return 7;
            case (month <= 12):
                return 10;
            default:
                throw new Error('failed convrting to season');
        }
    };

    //use year month to get json file path
    $scope.getJsonPath = function(year, month, archive) {
        for (var file in archive) {
            if (archive[file].year == year) {
                var months = archive[file].months;
                $scope.yearRead = archive[file].year;
                $scope.monthRead = $scope.monthToSeason(month); 
                for (i = 0, l = months.length; i < l; i++ ) {
                    if ($scope.monthRead === months[i].month && months[i].json) {
                        return months[i].json;
                    }
                }
                if ($scope.monthRead === 1) {
                    //console.log('failed to get json path, try year - 1, 10');
                    return $scope.getJsonPath(year - 1, 10, archive);
                } else {
                    //console.log('failed to get json path, try year, month - 3');
                    return $scope.getJsonPath(year, month - 3, archive);
                }
            }
        }
        //console.log('failed to get json path, try year - 1');
        return $scope.getJsonPath(year - 1, month, archive);
    };

    //use $http to get bangumi data
    $scope.readBgm = function(filePath, order, reverse) {
        //ngProgressLite.start();
        $http.get(filePath)
            .success(function(data, status, headers) {
                $scope.bangumis = $scope.order(data, order, reverse);
                $scope.query.titleCN = '';
                if (headers('Last-Modified')) {
                    var tempDate = new Date(headers('Last-Modified'));
                    $scope.status.lastModifieded = '数据更新日期: ' + tempDate.getFullYear() + '年' + 
                        (tempDate.getMonth() + 1) + '月' + tempDate.getDate() + '日';
                }
                //ngProgressLite.done();
            })
            .error(function(data, status) {
                $scope.status.error = true;
                $scope.status.errorMsg = '读取 ' + filePath + ' 出错. 错误代码: ' + status + '. 请点击上方的“提交问题”按钮.';
            });
    };

    //use $http to get archive data, then init page
    $http.get('json/archive.json')
        .success(function(data, status, headers) {
            //if server time didn't exist, use local time
            dateNow = headers('Date') ? new Date(headers('Date')) : new Date();
            weekDayNow = dateNow.getDay();
            yearNow = dateNow.getFullYear();
            monthNow = dateNow.getMonth() + 1;
            $scope.query.weekDayCN = weekDayNow;

            for (var file in data) {
                data[file].show = data[file].year == yearNow ? true : false;
            }
            $scope.archive = data;
            if ($scope.allOnly) {
                $scope.readBgm($scope.getJsonPath(yearNow, monthNow, data), 'jp', false);
                $scope.query.weekDayCN = -1;
            } else {
                $scope.readBgm($scope.getJsonPath(yearNow, monthNow, data), $scope.status.ordered, !$scope.status.reversed);
            }
        })
        .error(function(data, status) {
            $scope.status.error = true;
            $scope.status.errorMsg = '读取 archive.json 出错. 错误代码: ' + status + '. 请点击上方的“提交问题”按钮.';
        });
    $scope.siteList = $scope.getSiteCookie($scope.siteList);
    $scope.query.newBgm = ipCookie('showNew') || false;
    $scope.query.nextDayTime = ipCookie('nextDayTime') || 24;
    $scope.allOnly = ipCookie('allOnly') || false;
    $scope.setting.newTab = ipCookie('newTab') || false;
    $scope.changeTarget();
    $scope.checkSiteList();
    $scope.checkNextDayTimeFlag();
}])

/*
//nav bar template
.directive('navBar', function() {
    return {
        restrict: 'E',
        templateUrl: 'nav.html'
    };
})

//table template
.directive('itemList', function() {
    return {
        restrict: 'E',
        templateUrl: 'list.html'
    };
})

//side bar template
.directive('sideBar', function() {
    return {
        restrict: 'E',
        templateUrl: 'sidebar.html'
    };
})

//used to filter bangumi data
.filter('bgmFilter', '$scope', function($scope) {
   return function(item) {
       if (item.weekDayCN === $scope.query.weekDayCN) {
            return true;
       } else {
            return false;
       }
   };
})*/


//filter used to format time data
.filter('selectAllButton', function() {
    return function(flag) {
        return flag ? '全选' : '全不选';
    };
})

//filter used to format weekday data
.filter('weekday', function() {
    var weekDayList = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return function(weekDayNum) {
        return weekDayList[weekDayNum];
    };
})

//filter used to format time data
.filter('time', function() {
    return function(originTime) {
        return originTime ? originTime.slice(0,2) + ':' + originTime.slice(2) : '(预计)';
    };
})

//filter used to format month data
.filter('monthCN', function() {
    return function(originMonth) {
        switch (+originMonth) {
            case 1:
                return '一月';
            case 4:
                return '四月';
            case 7:
                return '七月';
            case 10:
                return '十月';
            default:
                throw new Error('failed to convert month');
        }
    };
})

//filter used to format bangumi link
.filter('onair', function() {
    return function(link) {
        switch (getDomain(link)) {
            case 'youku':
                return '优酷';     
            case 'sohu':
                return '搜狐';
            case 'qq':
                return '腾讯';
            case 'iqiyi':
                return '爱奇艺';
            case 'letv':
                return '乐视';
            case 'pptv':
                return 'PPTV';
            case 'tudou':
                return '土豆';
            case 'bilibili':
                return 'B站';
            case 'acfun':
                return 'A站';
            case 'movie':
                return '迅雷';
            case 'empty':
                return '暂无';
            default:
                return '未知';
        }
    };
})

//filter use to choose and order onair site
.filter('linkFilter', function() {
    return function(array, siteList) {
        var nArray = [];
        nArray = array.filter(function(item) {
            for (var i = 0, l = siteList.length; i < l; i++) {
                if (siteList[i].domain === getDomain(item)) {
                    return siteList[i].show;
                }
            }
            return false;
        });
        if (nArray.length !== 0) {
            return nArray.sort(function(a, b) {
                a = getDomain(a);
                b = getDomain(b);
                if (a < b) {
                    return -1;
                } else if (a > b) {
                    return 1;
                } else {
                    return 0;
                }
            });
        } else {
            return ['#'];
        }
    };
});

