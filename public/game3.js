window.onload = function() {

    var game = new Phaser.Game(1152, 672, Phaser.AUTO, '', { preload: preload, create: create, render: render });

    var cellSize = 32;
    var axisWidth = 30;
    var colors = [0xFF0000, 0xFF9900, 0xFFFF00, 0x00FF00, 0x00FFFF, 0x0000FF, 0x9900FF, 0xFF00FF];
    var symbols = Phaser.ArrayUtils.shuffle('abcdefghijklmopqrstuvwxyz'.split('')).slice(0, 18);
    var textStyle = { font: 'bold 20px Arial', align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' };
    var tweenDuration = 500;
    var tweenEase = 'Linear';
    var cells;
    var axes;
    var axisDown;
    var axisOver;

    function preload () {

        game.load.image('logo', 'phaser.png');
        game.load.spritesheet('picture', 'picture-1024x512.jpg', 32, 32);

    }

    function createCells () {
        cells = game.add.group();
        cells.x = 64;
        cells.y = 96;

        for (var y = 0; y < 16; ++y) {
            for (var x = 0; x < 32; ++x) {
                var cellIndex = x + y * 32;
                var cell = game.add.sprite(0, 0, 'picture', cellIndex, cells);
                cell.x = x * cellSize;
                cell.y = y * cellSize;
            }
        }
    }

    function toggleAxisRepeated(axis, span) {
        axis.isRepeated = span;

        var targetX = -axisWidth * 0.5;
        var targetY = -axisWidth * 0.5;
        if (axis.isRepeated === 2) {
            if (!axis.isHorizontal) {
                targetX += -axisWidth;
            } else {
                targetY += -axisWidth;
            }
        } else if (axis.isRepeated === 8) {
            if (!axis.isHorizontal) {
                targetX += cellSize * 32 + axisWidth * 2;
            } else {
                targetY += cellSize * 16 + axisWidth;
            }
        } else if (axis.isRepeated === 16) {
            if (!axis.isHorizontal) {
                // empty
            } else {
                targetY += cellSize * 16 + axisWidth * 2;
            }
        } else if (axis.isRepeated === 4) {
            if (!axis.isHorizontal) {
                targetX += cellSize * 32 + axisWidth;
            } else {
                targetY += -axisWidth * 2;
            }
        }

        game.add.tween(axis).to({
            x: targetX,
            y: targetY
        }, tweenDuration, tweenEase, true);

        var handler = function (target, tween, cell) { cell.visible = false; };
        for (var x = 0; x < 32; ++x) {
            var cell = axis.getAt(x);
            game.add.tween(cell.getAt(0).scale).to({ x: span }, tweenDuration, tweenEase, true);
            game.add.tween(cell.getAt(1)).to({ x: cellSize * span * 0.5 }, tweenDuration, tweenEase, true);
            game.add.tween(cell).to({ x: x * cellSize * span }, tweenDuration, tweenEase, true);
            if ((x + 1) * span > (axis.isHorizontal ? 32 : 16)) {
                var tween = game.add.tween(cell.scale).to({ x: 0, y: 0 }, tweenDuration, tweenEase, true);
                if (tweenDuration === 1) {
                    cell.visible = false;
                } else {
                    tween.onComplete.addOnce(handler, this, 0, cell);
                }
            } else {
                cell.visible = true;
                game.add.tween(cell.scale).to({ x: 1, y: 1 }, tweenDuration, tweenEase, true);
            }
        }
    }

    function toggleAxisForward(axis) {
        axis.isForward = !axis.isForward;

        for (var x = 0; x < 32; x += 2) {
            var cell1 = axis.getAt(x);
            var cell2 = axis.getAt(x + 1);
            axis.swap(cell1, cell2);
            game.add.tween(cell1).to({ x: cellSize * axis.isRepeated * (x + 1) }, tweenDuration, tweenEase, true);
            game.add.tween(cell2).to({ x: cellSize * axis.isRepeated * x }, tweenDuration, tweenEase, true);
        }
    }

    function toggleAxisHorizontal(axis) {
        axis.isHorizontal = !axis.isHorizontal;

        var targetX = -axisWidth * 0.5;
        var targetY = -axisWidth * 0.5;
        if (axis.isRepeated === 2) {
            if (!axis.isHorizontal) {
                targetX += -axisWidth;
            } else {
                targetY += -axisWidth;
            }
        } else if (axis.isRepeated === 8) {
            if (!axis.isHorizontal) {
                targetX += cellSize * 32 + axisWidth * 2;
            } else {
                targetY += cellSize * 16 + axisWidth;
            }
        } else if (axis.isRepeated === 16) {
            if (!axis.isHorizontal) {
                // empty
            } else {
                targetY += cellSize * 16 + axisWidth * 2;
            }
        } else if (axis.isRepeated === 4) {
            if (!axis.isHorizontal) {
                targetX += cellSize * 32 + axisWidth;
            } else {
                targetY += -axisWidth * 2;
            }
        }

        game.add.tween(axis).to({
            rotation: axis.isHorizontal ? 0 : Math.PI * 0.5,
            x: targetX,
            y: targetY
        }, tweenDuration, tweenEase, true);

        for (var x = 0; x < 32; ++x) {
            var cell = axis.getAt(x);
            game.add.tween(cell.getAt(1)).to({
                rotation: axis.isHorizontal ? 0 : -Math.PI * 0.5
            }, tweenDuration, tweenEase, true);
        }
    }

    function updateCells() {
        for (var i = 0; i < 512; ++i) {
            var cell = cells.getAt(i);
            var x = 0;
            var y = 0;
            for (var j = 0, c = i >> j & 1; j < 9; ++j, c = i >> j & 1) {
                var axis = axes.getAt(j);
                if (axis.isHorizontal) {
                    x += (axis.isForward ? c : 1 - c) * axis.isRepeated;
                } else {
                    y += (axis.isForward ? c : 1 - c) * axis.isRepeated;
                }
            }
            game.add.tween(cell).to({
                x: x * cellSize,
                y: y * cellSize
            }, tweenDuration, tweenEase, true);
        }
    }

    function onDown(sprite, pointer, axis) {
        axisDown = axis;
    }

    function onOver(sprite, pointer, axis) {
        axisOver = axis;
    }

    function onOut(sprite, pointer, axis) {
        if (axis === axisOver) {
            axisOver = null;
        }
    }

    function onUp() {
        if (axisDown && axisOver) {
            if (axisDown === axisOver) {
                toggleAxisForward(axisOver);
            }
            if (axisDown.isHorizontal !== axisOver.isHorizontal) {
                toggleAxisHorizontal(axisDown);
                toggleAxisHorizontal(axisOver);
                if (axisDown.isRepeated === axisOver.isRepeated) {
                    toggleAxisRepeated(axisDown, axisDown.isRepeated);
                    toggleAxisRepeated(axisOver, axisOver.isRepeated);
                }
            }
            if (axisDown.isRepeated !== axisOver.isRepeated) {
                var axisDownSpan = axisDown.isRepeated;
                toggleAxisRepeated(axisDown, axisOver.isRepeated);
                toggleAxisRepeated(axisOver, axisDownSpan);
            }
            updateCells();
        }

        axisDown = null;
        axisOver = null;
    }

    function createAxes () {
        axes = game.add.group();
        axes.x = 64;
        axes.y = 96;

        for (var y = 0; y < 9; ++y) {
            var cellBackgroundGraphics = game.add.graphics();

            cellBackgroundGraphics.beginFill(0xFFFFFF/*colors[y]*/);
            cellBackgroundGraphics.lineStyle(2, 0x000000, 1);
            cellBackgroundGraphics.drawRect(0, 0, cellSize, axisWidth);
            cellBackgroundGraphics.endFill();

            var cellBackgroundTexture = cellBackgroundGraphics.generateTexture();
            cellBackgroundGraphics.destroy();

            var axis = game.add.group(axes);
            axis.isRepeated = 1;
            axis.isHorizontal = true;
            axis.isForward = true;

            for (var x = 0; x < 32; ++x) {
                var cell = game.add.group(axis);
                cell.inputEnableChildren = true;
                cell.onChildInputDown.add(onDown, this, 0, axis);
                cell.onChildInputOver.add(onOver, this, 0, axis);
                cell.onChildInputOut.add(onOut, this, 0, axis);
                cell.onChildInputUp.add(onUp, this, 0);
                var cellBackgroundSprite = game.add.sprite(0, 0, cellBackgroundTexture);
                cell.add(cellBackgroundSprite);
                var str = symbols[y * 2 + x % 2];//(x % 2).toString(10);
                var cellText = game.add.text(cellSize * 0.5, axisWidth * 0.5, str, textStyle);
                cellText.setTextBounds(-cellSize * 0.5, -cellSize * 0.5, cellSize, cellSize);
                cell.add(cellText);
                cell.x = x * cellSize;
            }

            axis.pivot.y = axisWidth * 0.5;
            axis.pivot.x = -axisWidth * 0.5;
            axis.x = -axisWidth * 0.5;
            axis.y = -axisWidth * 0.5;

            toggleAxisRepeated(axis, Math.pow(2, y % 5));
            if (y > 4) {
                toggleAxisHorizontal(axis);
            }
        }
    }

    function shuffleAxes() {
        axes.visible = false;
        //cells.visible = false;
        tweenDuration = 1;
        var i = 0;
        var id = setInterval(function () {
            if (i > 32) {
                clearInterval(id);
                axes.visible = true;
                //cells.visible = true;
                tweenDuration = 500;
            } else {
                axisDown = axes.getAt(Math.floor(Math.random() * 9));
                axisOver = axes.getAt(Math.floor(Math.random() * 9));
                onUp();
                ++i;
            }
        }, 100);
    }

    function create () {

        var logo = game.add.sprite(game.world.centerX, game.world.centerY, 'logo');
        logo.anchor.setTo(0.5, 0.5);

        createCells();
        createAxes();
        shuffleAxes();
    }

    function render() {
        if (axisDown) {
            game.debug.rectangle(axisDown.getBounds(), '#FF0000', false);
            if (axisOver && axisDown !== axisOver) {
                game.debug.rectangle(axisOver.getBounds(), '#FF0000', false);
            }
        } else {
            game.debug.reset();
        }
    }
};