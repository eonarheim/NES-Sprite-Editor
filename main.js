

var canvas = document.getElementById('editor');
var spriteRomData = null;

var scale = 10;
var width = 128;
var height = 256;

canvas.width = width * scale;
canvas.height = height * scale;

var ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

document.body.appendChild(canvas);

ctx.fillStyle = 'gray';
ctx.fillRect(0, 0, canvas.width, canvas.height);

var spriteCanvas = document.createElement('canvas');
spriteCanvas.width = width;
spriteCanvas.height = height;
var spriteCtx = spriteCanvas.getContext('2d');
spriteCtx.imageSmoothingEnabled = false;

var imageData = ctx.getImageData(0, 0, spriteCanvas.width, spriteCanvas.height);//ctx.getImageData(0, 0, canvas.width, canvas.height);
var data = imageData.data;



var mapping = ['background', 'color1', 'color2', 'color3']

var pallete = {
    background : {
        r: 0, 
        g: 0,
        b: 0,
        nes: '0x00'  
    },
    color1 : { // rgb(248,56,0)
        r: 248,
        g: 56,
        b: 0,
        nes: '0x16'
    },

    color2 : { // rgb(252,160,68)
        r: 252,
        g: 160,
        b: 68,
        nes: '0x27'

    },

    color3 : { //rgb(172,124,0)
        r: 172,
        g: 124,
        b: 0,
        nes: '0x18'
    }
}

var selectedPallete = 'background';
var selectedColor = null;
var selectedNes = null;

var elements = document.getElementsByClassName('selectable');


function toggleGrid(){
    alert('todo');
}

var grid = document.getElementById('grid');
grid.addEventListener('change', toggleGrid);

for(var el of elements){
    el.addEventListener('mouseup', function(evt){
        if(evt.target.dataset.pallete){
            selectedPallete = evt.target.dataset.pallete;
            
        }

        if(evt.target.dataset.nes){
            selectedColor = evt.target.style.backgroundColor;
            selectedNes = evt.target.dataset.nes;
        }

        if(selectedColor && selectedPallete){
            // save the current state of teh rom before switching palletes
            spriteRomData = canvasToNES(imageData);

            var color = selectedColor.match(/(\d{1,3})\,\s*(\d{1,3})\,\s*(\d{1,3})/);
            pallete[selectedPallete].r = color[1];
            pallete[selectedPallete].g = color[2];
            pallete[selectedPallete].b = color[3];
            pallete[selectedPallete].nes = selectedNes;

            // draw the rom with the new pallet data
            NEStoCanvas(spriteRomData);
            
            selectedColor = null;
            selectedNes = null;
        }
        updatePallet();
        //spriteRomData = canvasToNES(imageData);
        //evt.target.style.border = 'blue'
    });
}

function setElementColor(elementId, r, g, b){
    document.getElementById(elementId).style.backgroundColor = 'rgb('+r+','+g+','+b+')';
}

function getColorLuminance(color) {
    return (color.r * 0.2126) + (color.g * 0.7152) + (color.b * 0.0722);
}

function getWhiteOrBlack(color){
    return getColorLuminance(color) > .1 ? 'black' : 'white';
}

function updatePallet(){
    var bgColor = pallete.background;
    var c1 = pallete.color1;
    var c2 = pallete.color2;
    var c3 = pallete.color3;
    
    setElementColor('brush',  pallete[selectedPallete].r,  pallete[selectedPallete].g,  pallete[selectedPallete].b);
    setElementColor('background', bgColor.r, bgColor.g, bgColor.b);
    setElementColor('color1', c1.r, c1.g, c1.b);
    setElementColor('color2', c2.r, c2.g, c2.b);
    setElementColor('color3', c3.r, c3.g, c3.b);

    document.getElementById('brush').style.color = getWhiteOrBlack(pallete[selectedPallete]);
    document.getElementById('background').style.color = getWhiteOrBlack(bgColor);
    document.getElementById('color1').style.color = getWhiteOrBlack(c1);
    document.getElementById('color2').style.color = getWhiteOrBlack(c2);
    document.getElementById('color3').style.color = getWhiteOrBlack(c3);
}
updatePallet();



function putPixel(x, y, pallete, palleteColor, imageData) {
    var canvasImageOffset = (x  + imageData.width * y) * 4;
    var color = pallete[palleteColor];
    imageData.data[canvasImageOffset + 0] = color.r;
    imageData.data[canvasImageOffset + 1] = color.g;
    imageData.data[canvasImageOffset + 2] = color.b;
}

function getPixel(x, y, imageData) {
    var canvasImageOffset = (x  + imageData.width * y) * 4;
    var color = {
        r: imageData.data[canvasImageOffset + 0],
        g: imageData.data[canvasImageOffset + 1],
        b: imageData.data[canvasImageOffset + 2]
    };

    if(!color){
        throw new Error("Invalid pixel (" + x + ", " + y + ")");
    }

    return color;
}



function getXY(evt){
    var x = Math.floor((evt.x - evt.target.offsetLeft) / scale);
    var y = Math.floor((evt.y - evt.target.offsetTop) / scale);
    return {
        x: x,
        y: y
    }
}

document.getElementById('editor').addEventListener('mousemove', function(evt){
    var coords = getXY(evt);
    document.getElementById('coord').innerText = '(' + coords.x + ', ' + coords.y + ')';
    if(_isMouseDown){
        handleDrawTool(evt);
    }
});
document.getElementById('editor').addEventListener('mousedown', down)
document.getElementById('editor').addEventListener('mouseup', up)
var _isMouseDown = false;
function down(){
    _isMouseDown = true;
}
function up() {
    _isMouseDown = false;
    
}

function handleDrawTool(evt){
    var coords = getXY(evt);
    putPixel(coords.x, coords.y, pallete, selectedPallete, imageData);
    paintCanvas();
}

function paintCanvas(){
    spriteCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(spriteCanvas, 0, 0, width * scale, height * scale);
}

function NEStoCanvas(byteArray){
    // every sprite is 16 bytes
    // 1 byte is 8 pixels 
    // byte n and byte n+8 control the color of that pixel
    //  (0,0) background
    //  (1,0) color 1
    //  (0,1) color 2
    //  (1,1) color 3
    for(var b = 0; b < byteArray.length; b+=16){
        ypos = Math.floor(b/height) * 8
        // draw sprite
        for(var i = 0; i < 8; i++){
            for(var j = 7; j >= 0; j--){
                var mask = 0x1;

                var channel1 = byteArray[b + i];

                var channel2 = byteArray[b + i + 8];

                var color = ((channel1 >>> j) & mask) + (((channel2 >>> j) & mask) << 1)

                putPixel(xpos + (7 - j), ypos + i, pallete, mapping[color], imageData);
            }            
        }        
        xpos = (xpos + 8) % width;
    }
    
    paintCanvas();
}



function rgbColorToPalleteTuple(color, pallete) {
    if(!color){
        throw new Error("Invalid color for current pallete! - " + colorKey(color));
    }
    function colorKey(color){
        return color.r + '+'+ color.g + '+' + color.b;
    }
    var palleteHash = {};
    palleteHash[colorKey(pallete.background)] = [0x0, 0x0];
    palleteHash[colorKey(pallete.color1)] = [0x1, 0x0];
    palleteHash[colorKey(pallete.color2)] = [0x0, 0x1];
    palleteHash[colorKey(pallete.color3)] = [0x1, 0x1];

    var result = palleteHash[colorKey(color)];
    
    return result;
}

function canvasToNES(imageData){
    // move 16 byte sprite and 512 sprites
    var byteArray = new Uint8Array(512 * 16);

    // tuple buffer
    var tupleBuffer = new Array(imageData.width * imageData.height);


    for(var y = 0; y < imageData.height; y++){
        for(var x = 0; x < imageData.width; x++){        
            // extract which color it is from imageData
            var color = getPixel(x, y, imageData);

            // find the pallet color
            var palletTuple = rgbColorToPalleteTuple(color, pallete);

            // write it to the tupleBuffer
            tupleBuffer[x + imageData.width * y] = palletTuple
        }
    }
    
    
    // tuple buffer has imageData.width * imageData.heigh pixels, so divide that by 16 for sprites
    var xtotal = 0;
    var ytotal = 0;
    for(var i = 0; i < byteArray.length; i+=8) {
        ytotal = Math.floor(i/height) * 8
        
        
        for(var y = ytotal; y < (ytotal + 8); y++){
            // do each row channel
            var byteChannel1 = 0x00;
            var byteChannel2 = 0x00;

            // complete row calculation
            for(var x = xtotal; x < (xtotal + 8); x++){
                var tup = tupleBuffer[x + y * imageData.width];
                byteChannel1 = (byteChannel1 << 1 | tup[0]);
                byteChannel2 = (byteChannel2 << 1 | tup[1]);
            }
            // write row
            byteArray[i] = byteChannel1;
            byteArray[i+8] = byteChannel2
            i++;
        }

        xtotal = (xtotal + 8) % width;
    }

    

    // convert to a blob
    var blob = new Blob([byteArray], {type: 'octect/stream'});
    var url = window.URL.createObjectURL(blob);
    return byteArray;
}

var xpos = 0;
var ypos = 0;

var xhr = new XMLHttpRequest();
xhr.open('GET', 'test.chr')
xhr.responseType = 'arraybuffer';

xhr.addEventListener('load', function(evt){
    spriteRomData = new Uint8Array(xhr.response);

    NEStoCanvas(spriteRomData);
});

xhr.send();