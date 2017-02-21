angular.module('app', ['d3-chord']);

angular.module('app').controller('mainController', ['$scope','$http',function ($scope,$http) {
        //所有数据
        $scope.dataMap={};
        //和弦图配置
        $scope.chordChartConfig={
            data:null,
            tooltip:{
                formatter:function (param) {
                    return `
                         从${ param.sname } 到 ${ param.tname } : ${ qFormat(param.svalue)}<br>
                         占 ${ param.sname } (${ qFormat(param.stotal) })的${ pFormat(param.svalue/param.stotal) } ,
                         占 全部（${ qFormat(param.mtotal) }） 的 ${ pFormat(param.svalue/param.mtotal) }<br>
                         从${ param.tname } 到 ${ param.sname } :  ${ qFormat(param.tvalue) }<br>
                         占 ${ param.tname } (${ qFormat(param.ttotal) })的${ pFormat(param.tvalue/param.ttotal) },
                         占 全部（${ qFormat(param.mtotal) }） 的 ${ pFormat(param.tvalue/param.mtotal) }
                    `;
                }
            },
            callback:{
                groupClick:function (d) {
                    $scope.addFilter(d._id);
                }
            }
        };
        $scope.years = d3.range(2005, 1865, -5);
        $scope.selected_year = 2005;
        $scope.hasFilters = false;
        $scope.filters = {};

        // FORMATS USED IN TOOLTIP TEMPLATE IN HTML
        let pFormat = d3.format(".1%");  // PERCENT FORMAT
        let qFormat = d3.format(",.0f"); // COMMAS FOR LARGE NUMBERS

        $scope.addFilter = function (name) {
            $scope.hasFilters = true;
            $scope.filters[name] = {
                name: name,
                hide: true
            };
        };
        //过滤数据
        $scope.doFilter = function () {
            var yearData = $scope.dataMap[$scope.selected_year];
            if (yearData && $scope.hasFilters) {
                $scope.chordChartConfig.data=yearData.filter(function (d) {
                    var fl = $scope.filters;
                    var v1 = d.node1, v2 = d.node2;

                    if ((fl[v1] && fl[v1].hide) || (fl[v2] && fl[v2].hide)) {
                        return false;
                    }
                    return true;
                });
            } else if (yearData) {
                $scope.chordChartConfig.data=yearData;
            }

        };

        // IMPORT THE CSV DATA
        $http({
            url:"data/trade.json",
            cache:false
        }).then(function (response) {
            let data={};
            response.data.forEach(function (d) {
                //转成数字
                d.year = +d.year;
                d.weight1 = +d.weight1;
                d.weight2 = +d.weight2;

                if (!data[d.year]) {
                    data[d.year] = []; // STORED BY YEAR
                }
                data[d.year].push(d);
            });
            $scope.dataMap=data;
            $scope.doFilter();
        });
        $scope.$watch('selected_year', $scope.doFilter);
        $scope.$watch('filters', $scope.doFilter, true);

    }]);