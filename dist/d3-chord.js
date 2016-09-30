'use strict';

angular.module('d3-chord', []).directive('d3Chord', ['$window', 'matrixFactory', function ($window, matrixFactory) {
    var colorPalette = ["#52c3f1", "#f77b6b", "#e3d64a", "#6767da", "#68d4b2", "#369d97", "#74d9ed", "#f8a13f", "#dae342", "#8d7be3", "#a4e59b", "#54becc"];
    var link = function link($scope, $el, $attr) {
        $scope.id = "d3-" + $scope.$id;
        var $container = $el,
            $tooltip = $container.find(".tooltip");
        var marg = [50, 50, 50, 50]; // TOP, RIGHT, BOTTOM, LEFT
        var size = getSize();
        var colors = d3.scale.ordinal().range(colorPalette);

        var chord = d3.layout.chord().padding(0.02).sortGroups(d3.descending).sortSubgroups(d3.ascending);
        var matrix = matrixFactory.chordMatrix().layout(chord).filter(function (item, r, c) {
            return item.node1 === r.name && item.node2 === c.name || item.node1 === c.name && item.node2 === r.name;
        }).reduce(function (items, r, c) {
            var value;
            if (!items[0]) {
                value = 0;
            } else {
                value = items.reduce(function (m, n) {
                    if (r === c) {
                        return m + (n.weight1 + n.weight2);
                    } else {
                        return m + (n.node1 === r.name ? n.weight1 : n.weight2);
                    }
                }, 0);
            }
            return { value: value, data: items };
        });

        var innerRadius = size.dims[1] / 2 - 100;

        var arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(innerRadius + 20);

        var path = d3.svg.chord().radius(innerRadius);

        var svg = d3.select($container[0]).append("svg").attr("class", "chart").attr({ width: size.width + "px", height: size.height + "px" }).attr("preserveAspectRatio", "xMinYMin").attr("viewBox", "0 0 " + size.width + " " + size.height);

        var gContainer = svg.append("g").attr("class", "g-container").attr("transform", "translate(" + (size.dims[0] / 2 + marg[3]) + "," + (size.dims[1] / 2 + marg[0]) + ")");
        var messages = svg.append("text").attr("class", "messages").attr("transform", "translate(10, 10)").text("loading...");

        //绘制图形
        function draw(data) {
            messages.attr("opacity", 1);
            messages.transition().duration(1000).attr("opacity", 0);
            matrix.data(data).resetKeys().addKeys(['node1', 'node2']).update();
            var groups = gContainer.selectAll("g.group").data(matrix.groups(), function (d) {
                return d._id;
            });

            var gEnter = groups.enter().append("g").attr("class", "group");

            gEnter.append("path").on("click", groupClick).on("mouseover", dimChords).on("mouseout", resetChords).style("fill", function (d) {
                return colors(d._id);
            }).attr("d", arc);

            gEnter.append("text").style("pointer-events", "none").style("font-size", "9px").attr("dy", ".35em").text(function (d) {
                return d._id;
            });

            groups.select("path").transition().duration(2000).attrTween("d", matrix.groupTween(arc));

            groups.select("text").transition().duration(2000).attr("transform", function (d) {
                d.angle = (d.startAngle + d.endAngle) / 2;
                var r = "rotate(" + (d.angle * 180 / Math.PI - 90) + ")";
                var t = " translate(" + (innerRadius + 26) + ")";
                return r + t + (d.angle > Math.PI ? " rotate(180)" : " rotate(0)");
            }).attr("text-anchor", function (d) {
                return d.angle > Math.PI ? "end" : "begin";
            });

            groups.exit().select("text").attr("fill", "orange");
            groups.exit().select("path").remove();

            groups.exit().transition().duration(1000).style("opacity", 0).remove();

            var chords = gContainer.selectAll("path.chord").data(matrix.chords(), function (d) {
                return d._id;
            });

            chords.enter().append("path").attr("class", "chord").style("fill", function (d) {
                return colors(d.source._id);
            }).attr("d", path).on("mouseover", chordMouseover).on("mouseout", hideTooltip);

            chords.transition().duration(2000).attrTween("d", matrix.chordTween(path));

            chords.exit().remove();
            //点击事件
            function groupClick(d) {
                d3.event.preventDefault();
                d3.event.stopPropagation();
                var config = $scope.config;
                if (config.callback && config.callback.groupClick) {
                    config.callback.groupClick(d);
                    if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                }
                resetChords();
            }

            //鼠标飘过事件
            function chordMouseover(d) {
                d3.event.preventDefault();
                d3.event.stopPropagation();
                dimChords(d);
                $tooltip.css("opacity", 1);
                var config = $scope.config;
                if (config.tooltip.formatter) {
                    var info = config.tooltip.formatter(matrix.read(d));
                    $tooltip.css({ left: d3.event.offsetX + 20, top: d3.event.offsetY + 20 }).html(info);
                }
            }

            //隐藏tooltip
            function hideTooltip() {
                d3.event.preventDefault();
                d3.event.stopPropagation();
                $tooltip.css("opacity", 0);
                resetChords();
            }

            //重置
            function resetChords() {
                d3.event.preventDefault();
                d3.event.stopPropagation();
                gContainer.selectAll("path.chord").style("opacity", 0.9);
            }

            function dimChords(d) {
                d3.event.preventDefault();
                d3.event.stopPropagation();
                gContainer.selectAll("path.chord").style("opacity", function (p) {
                    if (d.source) {
                        // COMPARE CHORD IDS
                        return p._id === d._id ? 0.9 : 0.1;
                    } else {
                        // COMPARE GROUP IDS
                        return p.source._id === d._id || p.target._id === d._id ? 0.9 : 0.1;
                    }
                });
            }
        }

        $scope.$watch("config.data", function (current, prev) {
            draw(current);
        });
        function getSize() {
            var dims = []; // USABLE DIMENSIONS
            var dimension = $scope.dimension;
            var width = void 0,
                height = void 0,
                ratio = [1, 1];
            if (dimension) {
                ratio = dimension.split(":").reverse().map(Number);
            }
            var clientWidth = $container[0].clientWidth;
            if (clientWidth < 10) {
                width = 1200;
                height = 800;
            } else {
                width = clientWidth;
                height = width * ratio[0] / ratio[1];
            }
            dims[0] = width - marg[1] - marg[3]; // WIDTH
            dims[1] = height - marg[0] - marg[2]; // HEIGHT
            return { width: width, height: height, dims: dims };
        }
        function resize() {
            size = getSize();
            svg.attr({
                width: size.width,
                height: size.height
            });
        }

        resize();
        $window.addEventListener("resize", function () {
            resize();
        });
    };

    return {
        restrict: 'EA',
        template: "<div id='{{id}}' class='d3-container'><div class='tooltip'></div>",
        replace: true,
        scope: {
            config: "=",
            dimension: "="
        },
        link: link
    };
}]).factory('matrixFactory', [function () {

    var chordMatrix = function chordMatrix() {

        var _matrix = [],
            objs = [],
            entry = {},
            dataStore = [],
            _id = 0;
        var matrixIndex = [],
            indexHash = {};
        var chordLayout, layoutCache;

        var filter = function filter() {};
        var reduce = function reduce() {};

        var matrix = {};

        matrix.update = function () {
            _matrix = [], objs = [], entry = {};

            layoutCache = { groups: {}, chords: {} };

            this.groups().forEach(function (group) {
                layoutCache.groups[group._id] = {
                    startAngle: group.startAngle,
                    endAngle: group.endAngle
                };
            });

            this.chords().forEach(function (chord) {
                layoutCache.chords[chordID(chord)] = {
                    source: {
                        _id: chord.source._id,
                        startAngle: chord.source.startAngle,
                        endAngle: chord.source.endAngle
                    },
                    target: {
                        _id: chord.target._id,
                        startAngle: chord.target.startAngle,
                        endAngle: chord.target.endAngle
                    }
                };
            });

            matrixIndex = Object.keys(indexHash);

            for (var i = 0; i < matrixIndex.length; i++) {
                if (!_matrix[i]) {
                    _matrix[i] = [];
                }
                for (var j = 0; j < matrixIndex.length; j++) {
                    objs = dataStore.filter(function (obj) {
                        return filter(obj, indexHash[matrixIndex[i]], indexHash[matrixIndex[j]]);
                    });
                    entry = reduce(objs, indexHash[matrixIndex[i]], indexHash[matrixIndex[j]]);
                    entry.valueOf = function () {
                        return +this.value;
                    };
                    _matrix[i][j] = entry;
                }
            }
            chordLayout.matrix(_matrix);
            return _matrix;
        };

        matrix.data = function (data) {
            dataStore = data;
            return this;
        };

        matrix.filter = function (func) {
            filter = func;
            return this;
        };

        matrix.reduce = function (func) {
            reduce = func;
            return this;
        };

        matrix.layout = function (d3_chordLayout) {
            chordLayout = d3_chordLayout;
            return this;
        };

        matrix.groups = function () {
            return chordLayout.groups().map(function (group) {
                group._id = matrixIndex[group.index];
                return group;
            });
        };

        matrix.chords = function () {
            return chordLayout.chords().map(function (chord) {
                chord._id = chordID(chord);
                chord.source._id = matrixIndex[chord.source.index];
                chord.target._id = matrixIndex[chord.target.index];
                return chord;
            });
        };

        matrix.addKey = function (key, data) {
            if (!indexHash[key]) {
                indexHash[key] = { name: key, data: data || {} };
            }
        };

        matrix.addKeys = function (props, fun) {
            for (var i = 0; i < dataStore.length; i++) {
                for (var j = 0; j < props.length; j++) {
                    this.addKey(dataStore[i][props[j]], fun ? fun(dataStore[i], props[j]) : {});
                }
            }
            return this;
        };

        matrix.resetKeys = function () {
            indexHash = {};
            return this;
        };

        function chordID(d) {
            var s = matrixIndex[d.source.index];
            var t = matrixIndex[d.target.index];
            return s < t ? s + "__" + t : t + "__" + s;
        }

        matrix.groupTween = function (d3_arc) {
            return function (d, i) {
                var tween;
                var cached = layoutCache.groups[d._id];

                if (cached) {
                    tween = d3.interpolateObject(cached, d);
                } else {
                    tween = d3.interpolateObject({
                        startAngle: d.startAngle,
                        endAngle: d.startAngle
                    }, d);
                }

                return function (t) {
                    return d3_arc(tween(t));
                };
            };
        };

        matrix.chordTween = function (d3_path) {
            return function (d, i) {
                var tween, groups;
                var cached = layoutCache.chords[d._id];

                if (cached) {
                    if (d.source._id !== cached.source._id) {
                        cached = { source: cached.target, target: cached.source };
                    }
                    tween = d3.interpolateObject(cached, d);
                } else {
                    if (layoutCache.groups) {
                        groups = [];
                        for (var key in layoutCache.groups) {
                            cached = layoutCache.groups[key];
                            if (cached._id === d.source._id || cached._id === d.target._id) {
                                groups.push(cached);
                            }
                        }
                        if (groups.length > 0) {
                            cached = { source: groups[0], target: groups[1] || groups[0] };
                            if (d.source._id !== cached.source._id) {
                                cached = { source: cached.target, target: cached.source };
                            }
                        } else {
                            cached = d;
                        }
                    } else {
                        cached = d;
                    }

                    tween = d3.interpolateObject({
                        source: {
                            startAngle: cached.source.startAngle,
                            endAngle: cached.source.startAngle
                        },
                        target: {
                            startAngle: cached.target.startAngle,
                            endAngle: cached.target.startAngle
                        }
                    }, d);
                }

                return function (t) {
                    return d3_path(tween(t));
                };
            };
        };

        matrix.read = function (d) {
            var g,
                m = {};

            if (d.source) {
                m.sname = d.source._id;
                m.sdata = d.source.value;
                m.svalue = +d.source.value;
                m.stotal = _matrix[d.source.index].reduce(function (k, n) {
                    return k + n;
                }, 0);
                m.tname = d.target._id;
                m.tdata = d.target.value;
                m.tvalue = +d.target.value;
                m.ttotal = _matrix[d.target.index].reduce(function (k, n) {
                    return k + n;
                }, 0);
            } else {
                g = indexHash[d._id];
                m.gname = g.name;
                m.gdata = g.data;
                m.gvalue = d.value;
            }
            m.mtotal = _matrix.reduce(function (m1, n1) {
                return m1 + n1.reduce(function (m2, n2) {
                    return m2 + n2;
                }, 0);
            }, 0);
            return m;
        };

        return matrix;
    };

    return {
        chordMatrix: chordMatrix
    };
}]);