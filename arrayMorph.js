var arrays = [
        [0.64, 0.02, 0.1, 0, 0.9, 0, 0.09, 0, 0.07, 0, 0.06, 0, 0.05, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0.81, 0, -0.09, 0, 0.03, 0, -0.02, 0, 0.01, 0, -0.01, 0, 0, 0],
        [-0.32, -0.16, -0.11, -0.08, -0.06, -0.05, -0.05, -0.04, -0.04, -0.03, -0.03, -0.02, -0.02]
    ],
    current = [];
var arrayMorph = function(value, max, arrays) {
    current = [];
    //Get the number of arrays so we can divide the input value equally between them
    numArrays = arrays.length;
    // Get the current input value
    // Get the input's max value
    // Get the current input value as a spectrum between the values
    absMorph = value / max * (numArrays - 1);
    // This is the "hard" previous preset index
    prev = Math.floor(absMorph);
    // This is the "hard" next preset index
    next = Math.ceil(absMorph);
    // This is the decimal difference between the prev and next
    diff = absMorph - prev;
    prevArray = arrays[prev];
    nextArray = presets[next];
    nextArray.forEach(function(v, i, a) {
        thisDiff = nextArray[i] - prevArray[i];
        thisVal = prevArray[i] + (thisDiff * diff);
        if (!isFinite(thisVal)) thisVal = 0;
        current.push(thisVal);
    });
    return current;
}