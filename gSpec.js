/*jslint sloppy:true, nomen:true */
/*global describe,it,expect,_,g */

var g = require('./g.js');

describe("Path", function () {

    it("can render itself to SVG.", function () {
        var p;
        p = new g.Path();
        p.moveTo(10, 20);
        p.lineTo(30, 40);
        p.close();
        expect(p.toSVG()).toBe('<path d="M10 20L30 40Z"/>');
    });

    it("can clone itself.", function () {
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
        p = new g.Path();
        p.moveTo(10, 20);
        p.lineTo(30, 40);
        p.close();
        group.paths.push(p);
        expect(group.toSVG()).toBe('<g><path d="M10 20L30 40Z"/></g>');
    });

    it("can clone itself.", function () {
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

    it("can be tagged.", function () {
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
        p1 = new g.Path();
        p1.addRect(10, 20, 30, 40);
        group.paths.push(p1);
        expect(group.bounds()).toEqual(new g.Rect(10, 20, 30, 40));
        p2 = new g.Path();
        p2.addRect(100, 200, 10, 10);
        group.paths.push(p2);
        expect(group.bounds()).toEqual(new g.Rect(10, 20, 100, 190));
    });

});

describe("Tagging", function () {

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
