var myMap = new Map();
myMap.set('one', 1);
myMap.set('two', 2);
myMap.set('three', 3);
var _a = ['one', 'four'].reduce(function (result, key) {
    result[key] = myMap.has(key) ? myMap.get(key) : null;
    return result;
}, {}), one = _a.one, four = _a.four;
console.log(one);
console.log(four);
