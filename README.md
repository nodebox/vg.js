g.js
====
g.js is a JavaScript library for vector graphics.

    var i = 0;
    var paths = [];
    g.grid(4, 4, 250, 250).map(function (pt, i) {
        var p = g.ellipse(pt, 75, 75);
        return p.resampleByAmount(i + 3);
    });


![Result of code example](g/screenshot.png)

Installation
------------
We currently support [Browserify](http://browserify.org/). To install, go to your project folder and type:

    npm install --save g.js

Credits
-------
g.js is based on [canvas.js](https://github.com/clips/pattern/blob/master/pattern/canvas.js) (BSD). De Smedt T. & Daelemans W. (2012). Pattern for Python. Journal of Machine Learning Research.

* Stefan Gabriëls <stefan@emrg.be>
* Frederik De Bleser <frederik@emrg.be>
