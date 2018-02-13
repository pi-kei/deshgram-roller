window.onload = function() {

    var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, render: render });

    var cellSize = 100;
    var axisWidth = 30;
    var colors = [0xFF0000, 0xCCCC00, 0x00FF00, 0x0000FF];
    var symbols = Phaser.ArrayUtils.shuffle('abcdefghijklmopqrstuvwxyz'.split('')).slice(0, 8);
    var skin = 'non-numeric';
    var textStyle = { font: 'bold 20px Arial', align: 'center', boundsAlignH: 'center', boundsAlignV: 'middle' };
    var tweenDuration = 500;
    var tweenEase = 'Linear';
    var cells;
    var axes;
    var axisDown;
    var axisOver;

    function preload () {

        game.load.image('logo', 'phaser.png');
        game.load.image('toggleSkinButton', 'toggleSkinButton.png');

    }

    function createCells () {
        var cellBackgroundGraphics = game.add.graphics();

        cellBackgroundGraphics.beginFill(0xFFFFFF);
        cellBackgroundGraphics.lineStyle(2, 0x000000, 1);
        cellBackgroundGraphics.drawRect(0, 0, cellSize, cellSize);
        cellBackgroundGraphics.endFill();

        var cellBackgroundTexture = cellBackgroundGraphics.generateTexture();
        cellBackgroundGraphics.destroy();

        cells = game.add.group();
        cells.x = 100;
        cells.y = 100;

        for (var y = 0; y < 4; ++y) {
            for (var x = 0; x < 4; ++x) {
                var cell = game.add.group(cells);
                var cellBackgroundSprite = game.add.sprite(0, 0, cellBackgroundTexture);
                var cellIndex = x + y * 4;
                var str;
                if (skin === 'numeric') {
                    str = ('0000' + cellIndex.toString(2)).slice(-4) + '\n' + cellIndex;
                } else {
                    str = Phaser.ArrayUtils.shuffle([
                        symbols[(cellIndex & 1) % 2],
                        symbols[2 + (cellIndex >> 1 & 1) % 2],
                        symbols[4 + (cellIndex >> 2 & 1) % 2],
                        symbols[6 + (cellIndex >> 3 & 1) % 2]
                    ]).join('');
                }
                var cellText = game.add.text(0, 0, str, textStyle);
                cellText.setTextBounds(0, 0, cellSize, cellSize);
                if (skin === 'numeric') {
                    cellText.addColor('#' + ('000000' + colors[3].toString(16)).slice(-6), 0);
                    cellText.addColor('#' + ('000000' + colors[2].toString(16)).slice(-6), 1);
                    cellText.addColor('#' + ('000000' + colors[1].toString(16)).slice(-6), 2);
                    cellText.addColor('#' + ('000000' + colors[0].toString(16)).slice(-6), 3);
                    cellText.addColor('#000000', 4);
                }
                cell.add(cellBackgroundSprite);
                cell.add(cellText);
                cell.x = x * cellSize;
                cell.y = y * cellSize;
            }
        }
    }

    function toggleAxisRepeated(axis) {
        axis.isRepeated = !axis.isRepeated;

        var targetX = -axisWidth * 0.5;
        var targetY = -axisWidth * 0.5;
        if (!axis.isRepeated) {
            if (!axis.isHorizontal) {
                targetX += cellSize * 4 + axisWidth;
            } else {
                targetY += cellSize * 4 + axisWidth;
            }
        }

        game.add.tween(axis).to({
            x: targetX,
            y: targetY
        }, tweenDuration, tweenEase, true);

        for (var x = 0; x < 4; ++x) {
            var cell = axis.getAt(x);
            if (axis.isRepeated) {
                if (x < 2) {
                    game.add.tween(cell.getAt(0).scale).to({ x: 1 }, tweenDuration, tweenEase, true);
                    game.add.tween(cell.getAt(1)).to({ x: cellSize * 0.5 }, tweenDuration, tweenEase, true);
                    if (x === 1) {
                        game.add.tween(cell).to({ x: cellSize }, tweenDuration, tweenEase, true);
                    }
                } else {
                    game.add.tween(cell.scale).to({ x: 1, y: 1 }, tweenDuration, tweenEase, true);
                }
            } else {
                if (x < 2) {
                    game.add.tween(cell.getAt(0).scale).to({ x: 2 }, tweenDuration, tweenEase, true);
                    game.add.tween(cell.getAt(1)).to({ x: cellSize }, tweenDuration, tweenEase, true);
                    if (x === 1) {
                        game.add.tween(cell).to({ x: cellSize * 2 }, tweenDuration, tweenEase, true);
                    }
                } else {
                    game.add.tween(cell.scale).to({ x: 0, y: 0 }, tweenDuration, tweenEase, true);
                }
            }
        }
    }

    function toggleAxisForward(axis) {
        axis.isForward = !axis.isForward;

        var cell1 = axis.getAt(0);
        var cell2 = axis.getAt(1);
        axis.swap(cell1, cell2);
        game.add.tween(cell1).to({ x: cellSize * (axis.isRepeated ? 1 : 2) }, tweenDuration, tweenEase, true);
        game.add.tween(cell2).to({ x: 0 }, tweenDuration, tweenEase, true);

        cell1 = axis.getAt(2);
        cell2 = axis.getAt(3);
        axis.swap(cell1, cell2);
        game.add.tween(cell1).to({ x: cellSize * 3 }, tweenDuration, tweenEase, true);
        game.add.tween(cell2).to({ x: cellSize * 2 }, tweenDuration, tweenEase, true);
    }

    function toggleAxisHorizontal(axis) {
        axis.isHorizontal = !axis.isHorizontal;

        var targetX = -axisWidth * 0.5;
        var targetY = -axisWidth * 0.5;
        if (!axis.isRepeated) {
            if (!axis.isHorizontal) {
                targetX += cellSize * 4 + axisWidth;
            } else {
                targetY += cellSize * 4 + axisWidth;
            }
        }

        game.add.tween(axis).to({
            rotation: axis.isHorizontal ? 0 : Math.PI * 0.5,
            x: targetX,
            y: targetY
        }, tweenDuration, tweenEase, true);

        for (var x = 0; x < 4; ++x) {
            var cell = axis.getAt(x);
            game.add.tween(cell.getAt(1)).to({
                rotation: axis.isHorizontal ? 0 : -Math.PI * 0.5
            }, tweenDuration, tweenEase, true);
        }
    }

    function updateCells() {
        for (var i = 0; i < 16; ++i) {
            var cell = cells.getAt(i);
            var x = 0;
            var y = 0;
            for (var j = 0, c = i >> j & 1; j < 4; ++j, c = i >> j & 1) {
                var axis = axes.getAt(j);
                if (axis.isHorizontal) {
                    x += (axis.isForward ? c : 1 - c) * (axis.isRepeated ? 1 : 2);
                } else {
                    y += (axis.isForward ? c : 1 - c) * (axis.isRepeated ? 1 : 2);
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
        if (!axisDown || !axisOver) {
            return;
        }

        if (axisDown === axisOver) {
            toggleAxisForward(axisOver);
        }
        if (axisDown.isHorizontal !== axisOver.isHorizontal) {
            toggleAxisHorizontal(axisDown);
            toggleAxisHorizontal(axisOver);
        }
        if (axisDown.isRepeated !== axisOver.isRepeated) {
            toggleAxisRepeated(axisDown);
            toggleAxisRepeated(axisOver);
        }

        updateCells();

        axisDown = null;
        axisOver = null;
    }

    function createAxes () {
        axes = game.add.group();
        axes.x = 100;
        axes.y = 100;

        for (var y = 0; y < 4; ++y) {
            var cellBackgroundGraphics = game.add.graphics();

            cellBackgroundGraphics.beginFill(skin === 'numeric' ? colors[y] : 0xFFFFFF);
            cellBackgroundGraphics.lineStyle(2, 0x000000, 1);
            cellBackgroundGraphics.drawRect(0, 0, cellSize, axisWidth);
            cellBackgroundGraphics.endFill();

            var cellBackgroundTexture = cellBackgroundGraphics.generateTexture();
            cellBackgroundGraphics.destroy();

            var axis = game.add.group(axes);
            axis.isRepeated = true;
            axis.isHorizontal = true;
            axis.isForward = true;

            for (var x = 0; x < 4; ++x) {
                var cell = game.add.group(axis);
                cell.inputEnableChildren = true;
                cell.onChildInputDown.add(onDown, this, 0, axis);
                cell.onChildInputOver.add(onOver, this, 0, axis);
                cell.onChildInputOut.add(onOut, this, 0, axis);
                cell.onChildInputUp.add(onUp, this, 0);
                var cellBackgroundSprite = game.add.sprite(0, 0, cellBackgroundTexture);
                var str = skin === 'numeric' ? (x % 2).toString(10) : symbols[y * 2 + x % 2];
                var cellText = game.add.text(cellSize * 0.5, axisWidth * 0.5, str, textStyle);
                cellText.setTextBounds(-cellSize * 0.5, -cellSize * 0.5, cellSize, cellSize);
                cell.add(cellBackgroundSprite);
                cell.add(cellText);
                cell.x = x * cellSize;
            }

            axis.pivot.y = axisWidth * 0.5;
            axis.pivot.x = -axisWidth * 0.5;
            axis.x = -axisWidth * 0.5;
            axis.y = -axisWidth * 0.5;

            if (y === 1 || y === 3) {
                toggleAxisRepeated(axis);
            }
            if (y === 2 || y === 3) {
                toggleAxisHorizontal(axis);
            }
        }
    }

    function toggleSkin() {
        if (skin === 'numeric') {
            skin = 'non-numeric';
        } else {
            skin = 'numeric';
        }

        cells.destroy();
        axes.destroy();
        createCells();
        createAxes();
    }

    function create () {

        var logo = game.add.sprite(game.world.centerX, game.world.centerY, 'logo');
        logo.anchor.setTo(0.5, 0.5);

        createCells();
        createAxes();

        game.add.button(0,0,'toggleSkinButton',toggleSkin,this);
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