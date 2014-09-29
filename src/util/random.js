// Pseudo-random generator

'use strict';

// Generate a random function that is seeded with the given value.
exports.generator = function (seed) {
    // Based on random number generator from
    // http://indiegamr.com/generate-repeatable-random-numbers-in-js/
    return function (min, max) {
        min = min || 0;
        max = max || 1;
        seed = (seed * 9301 + 49297) % 233280;
        var v = seed / 233280;
        return min + v * (max - min);
    };
};
