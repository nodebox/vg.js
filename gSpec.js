/*jslint sloppy:true, nomen:true */
/*global require, describe, xdescribe, it, xit, expect, _, g,  */

var _ = require('underscore'),
    g = require('./g.js');

describe("Path", function () {

    it("can render itself to SVG.", function () {
        var p;
        p = new g.Path()
            .moveTo(10, 20)
            .lineTo(30, 40)
            .close();
        expect(p.toSVG()).toBe('<path d="M10 20L30 40Z"/>');
    });

    xit("can clone itself.", function () {
        var p, newP;
        p = new g.Path();
        p.fill = 'red';
        p.stroke = 'green';
        p.strokeWidth = 5;
        p.tags = {'foo': true};
        p.moveTo(33, 66);
        newP = p.clone();
        expect(newP.commands).toEqual([
            {type: 'M', x: 33, y: 66}
        ]);
        expect(newP.fill).toBe('red');
        expect(newP.stroke).toBe('green');
        expect(newP.hasTag('foo')).toBeTruthy();
    });

});

describe("Group", function () {

    it("can render itself to SVG.", function () {
        var group, p;
        group = new g.Group();
        expect(group.toSVG()).toBe('<g></g>');
        p = new g.Path()
            .moveTo(10, 20)
            .lineTo(30, 40)
            .close();
        group = g.group([p]);
        expect(group.toSVG()).toBe('<g><path d="M10 20L30 40Z"/></g>');
    });

    xit("can clone itself.", function () {
        var group, newGroup;
        group = new g.Group();
        group.paths.push(g.DEMO_RECT.clone());
        group.tag('foo', function () {
            return true;
        });
        newGroup = group.clone();
        expect(newGroup.paths.length).toBe(1);
        expect(newGroup.paths[0].hasTag('foo')).toBeTruthy();
        expect(newGroup.hasTag('foo')).toBeTruthy();
    });

    xit("can be tagged.", function () {
        var group, p1, p2;
        group = new g.Group();
        p1 = new g.Path();
        p2 = new g.Path();
        group.paths = [p1, p2];

        expect(group.findByTag('foo')).toEqual([]);
        group.tag('foo', function (p) {
            return true;
        });
        expect(group.findByTag('foo')).toEqual([p1, p2]);
        group.tag('bar', function (p) {
            return p === p1;
        });
        expect(group.findByTag('bar')).toEqual([p1]);
    });

    it("has bounds", function () {
        var group, p1, p2;
        group = new g.Group();
        expect(group.bounds()).toEqual(new g.Rect(0, 0, 0, 0));
        p1 = new g.Path()
            .rect(10, 20, 30, 40);
        group = g.group([p1]);
        expect(group.bounds()).toEqual(new g.Rect(10, 20, 30, 40));
        p2 = new g.Path()
            .rect(100, 200, 10, 10);
        group = g.group([p1, p2]);
        expect(group.bounds()).toEqual(new g.Rect(10, 20, 100, 190));
    });

});

xdescribe("Tagging", function () {

    it("can tag shapes", function () {
        var shape = g.DEMO_GROUP.clone();
        shape.tag("foo", function () {
            return true;
        });
        expect(shape.hasTag("foo")).toBeTruthy();
        _.each(shape.paths, function (path) {
            expect(path.hasTag("foo")).toBeTruthy();
        });
    });

});
