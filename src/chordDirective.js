angular.module('d3-chord', []).directive('d3Chord', ['$window', 'matrixFactory', function ($window, matrixFactory) {

    var link = function ($scope, $el, $attr) {
        const id = "d3-" + $scope.$id;
        let config = $scope.config;
        $scope.id = id;

        let size = [750, 750]; // SVG SIZE WIDTH, HEIGHT
        let marg = [50, 50, 50, 50]; // TOP, RIGHT, BOTTOM, LEFT
        let dims = []; // USABLE DIMENSIONS
        dims[0] = size[0] - marg[1] - marg[3]; // WIDTH
        dims[1] = size[1] - marg[0] - marg[2]; // HEIGHT

        let colors = d3.scale.ordinal()
            .range(['#9C6744', '#C9BEB9', '#CFA07E', '#C4BAA1', '#C2B6BF', '#121212', '#8FB5AA', '#85889E', '#9C7989', '#91919C', '#242B27', '#212429', '#99677B', '#36352B', '#33332F', '#2B2B2E', '#2E1F13', '#2B242A', '#918A59', '#6E676C', '#6E4752', '#6B4A2F', '#998476', '#8A968D', '#968D8A', '#968D96', '#CC855C', '#967860', '#929488', '#949278', '#A0A3BD', '#BD93A1', '#65666B', '#6B5745', '#6B6664', '#695C52', '#56695E', '#69545C', '#565A69', '#696043', '#63635C', '#636150', '#333131', '#332820', '#302D30', '#302D1F', '#2D302F', '#CFB6A3', '#362F2A']);

        let chord = d3.layout.chord()
            .padding(0.02)
            .sortGroups(d3.descending)
            .sortSubgroups(d3.ascending);
        let matrix = matrixFactory.chordMatrix()
            .layout(chord)
            .filter(function (item, r, c) {
                return (item.node1 === r.name && item.node2 === c.name) ||
                    (item.node1 === c.name && item.node2 === r.name);
            })
            .reduce(function (items, r, c) {
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
                return {value: value, data: items};
            });

        let innerRadius = (dims[1] / 2) - 100;

        let arc = d3.svg.arc()
            .innerRadius(innerRadius)
            .outerRadius(innerRadius + 20);

        let path = d3.svg.chord()
            .radius(innerRadius);

        let $container = $el, $tooltip = $container.find(".tooltip");
        let svg = d3.select($container[0]).append("svg")
            .attr("class", "chart")
            .attr({width: size[0] + "px", height: size[1] + "px"})
            .attr("preserveAspectRatio", "xMinYMin")
            .attr("viewBox", "0 0 " + size[0] + " " + size[1]);

        let gContainer = svg.append("g")
            .attr("class", "container")
            .attr("transform", "translate(" + ((dims[0] / 2) + marg[3]) + "," + ((dims[1] / 2) + marg[0]) + ")");
        let messages = svg.append("text")
            .attr("class", "messages")
            .attr("transform", "translate(10, 10)")
            .text("Updating...");

        //绘制图形
        function draw(data) {
            messages.attr("opacity", 1);
            messages.transition().duration(1000).attr("opacity", 0);
            matrix.data(data)
                .resetKeys()
                .addKeys(['node1', 'node2'])
                .update();
            let groups = gContainer.selectAll("g.group")
                .data(matrix.groups(), function (d) {
                    return d._id;
                });

            let gEnter = groups.enter()
                .append("g")
                .attr("class", "group");

            gEnter.append("path")
                .style("pointer-events", "none")
                .style("fill", function (d) {
                    return colors(d._id);
                })
                .attr("d", arc);

            gEnter.append("text")
                .attr("dy", ".35em")
                .on("click", groupClick)
                .on("mouseover", dimChords)
                .on("mouseout", resetChords)
                .text(function (d) {
                    return d._id;
                });

            groups.select("path")
                .transition().duration(2000)
                .attrTween("d", matrix.groupTween(arc));

            groups.select("text")
                .transition()
                .duration(2000)
                .attr("transform", function (d) {
                    d.angle = (d.startAngle + d.endAngle) / 2;
                    var r = "rotate(" + (d.angle * 180 / Math.PI - 90) + ")";
                    var t = " translate(" + (innerRadius + 26) + ")";
                    return r + t + (d.angle > Math.PI ? " rotate(180)" : " rotate(0)");
                })
                .attr("text-anchor", function (d) {
                    return d.angle > Math.PI ? "end" : "begin";
                });

            groups.exit().select("text").attr("fill", "orange");
            groups.exit().select("path").remove();

            groups.exit().transition().duration(1000)
                .style("opacity", 0).remove();

            let chords = gContainer.selectAll("path.chord")
                .data(matrix.chords(), function (d) {
                    return d._id;
                });

            chords.enter().append("path")
                .attr("class", "chord")
                .style("fill", function (d) {
                    return colors(d.source._id);
                })
                .attr("d", path)
                .on("mouseover", chordMouseover)
                .on("mouseout", hideTooltip);

            chords.transition().duration(2000)
                .attrTween("d", matrix.chordTween(path));

            chords.exit().remove();
            //点击事件
            function groupClick(d) {
                d3.event.preventDefault();
                d3.event.stopPropagation();
                if (config.callback && config.callback.groupClick) {
                    config.callback.groupClick(d);
                    if(!$scope.$$phase && !$scope.$root.$$phase) $scope.$apply();
                }
                resetChords();
            }

            //鼠标飘过事件
            function chordMouseover(d) {
                d3.event.preventDefault();
                d3.event.stopPropagation();
                dimChords(d);
                $tooltip.css("opacity", 1);
                if (config.tooltip.formatter) {
                    let info = config.tooltip.formatter(matrix.read(d));
                    $tooltip.html(info);
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
                    if (d.source) { // COMPARE CHORD IDS
                        return (p._id === d._id) ? 0.9 : 0.1;
                    } else { // COMPARE GROUP IDS
                        return (p.source._id === d._id || p.target._id === d._id) ? 0.9 : 0.1;
                    }
                });
            }
        }

        $scope.$watch("config.data", function (current, prev) {
            if (!angular.equals(current, prev)) {
                draw(current);
            }
        });

        function resize() {
            var width = $el.parent()[0].clientWidth;
            svg.attr({
                width: width,
                height: width / (size[0] / size[1])
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
            config: "="
        },
        link: link
    };
}]).factory('matrixFactory', [function () {

    var chordMatrix = function () {

        var _matrix = [], dataStore = [], _id = 0;
        var matrixIndex = [], indexHash = {};
        var chordLayout, layoutCache;

        var filter = function () {};
        var reduce = function () {};

        var matrix = {};

        matrix.update = function () {
            _matrix = [], objs = [], entry = {};

            layoutCache = {groups: {}, chords: {}};

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
                    entry.valueOf = function () { return +this.value };
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
                indexHash[key] = {name: key, data: data || {}};
            }
        };

        matrix.addKeys = function (props, fun) {
            for (var i = 0; i < dataStore.length; i++) {
                for (var j = 0; j < props.length; j++) {
                    this.addKey(dataStore[i][props[j]], fun ? fun(dataStore[i], props[j]):{});
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
            return (s < t) ? s + "__" + t: t + "__" + s;
        }

        matrix.groupTween = function (d3_arc) {
            return function (d, i) {
                var tween;
                var cached = layoutCache.groups[d._id];

                if (cached) {
                    tween = d3.interpolateObject(cached, d);
                } else {
                    tween = d3.interpolateObject({
                        startAngle:d.startAngle,
                        endAngle:d.startAngle
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
                    if (d.source._id !== cached.source._id){
                        cached = {source: cached.target, target: cached.source};
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
                            cached = {source: groups[0], target: groups[1] || groups[0]};
                            if (d.source._id !== cached.source._id) {
                                cached = {source: cached.target, target: cached.source};
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
            var g, m = {};

            if (d.source) {
                m.sname  = d.source._id;
                m.sdata  = d.source.value;
                m.svalue = +d.source.value;
                m.stotal = _matrix[d.source.index].reduce(function (k, n) { return k + n; }, 0);
                m.tname  = d.target._id;
                m.tdata  = d.target.value;
                m.tvalue = +d.target.value;
                m.ttotal = _matrix[d.target.index].reduce(function (k, n) { return k + n; }, 0);
            } else {
                g = indexHash[d._id];
                m.gname  = g.name;
                m.gdata  = g.data;
                m.gvalue = d.value;
            }
            m.mtotal = _matrix.reduce(function (m1, n1) {
                return m1 + n1.reduce(function (m2, n2) { return m2 + n2; }, 0);
            }, 0);
            return m;
        };

        return matrix;
    };

    return {
        chordMatrix: chordMatrix
    };
}]);



