// generated on 2016-06-09 using generator-webapp 2.0.0 by xinfeng_qian@hansight.com
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';//gulp插件加载器
import runSequence from 'run-sequence';//控制任务顺序
import browserSync from 'browser-sync';//可reload的静态服务器
import del from 'del';//删除工具

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

//编译scripts下的js文件
gulp.task('scripts', () => {
	return gulp.src('src/**/*.js')
		.pipe($.plumber())
		.pipe($.sourcemaps.init())
		.pipe($.babel())
		.pipe($.ngAnnotate({single_quotes: true}))
		.pipe($.concat('d3-chord.js'))
		.pipe(gulp.dest('dist'))
		.pipe($.rename({ suffix: '.min' }))
		.pipe($.uglify())
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest('dist'));
});
//启动服务,并监听文件变化，时时刷新
gulp.task('serve:dev', ['scripts'], () => {
    browserSync({
        notify: false,
        port: 3333,
        server: {
            baseDir: ['.tmp', 'demos'],
            routes: {
                '/bower_components': 'bower_components',
                '/src': 'src',
            }
        }
    });
    gulp.watch([
        'demos/**/*.html'
    ]).on('change', reload);

    gulp.watch('src/**/*.js', ['scripts',function () {
        reload();
    }]);

});
//清除编译的临时文件
gulp.task('clean', del.bind(null, ['.tmp', 'dist']));
//gzip
gulp.task('gzip',(cb)=>{
	return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});
//构建所有
gulp.task('build',(cb) => {
	runSequence('scripts','gzip',cb);
});
//清空并构建所有
gulp.task('default', (cb) => {
	runSequence('clean','build',cb);
});
