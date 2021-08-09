#!/bin/bash
echo "Copying to $OBSIDIAN_PLUGIN_DIR"
mkdir "$OBSIDIAN_PLUGIN_DIR/obsidian-rg"
cp main.js "$OBSIDIAN_PLUGIN_DIR/obsidian-rg/"
cp styles.css "$OBSIDIAN_PLUGIN_DIR/obsidian-rg/"
cp versions.json "$OBSIDIAN_PLUGIN_DIR/obsidian-rg/"
cp manifest.json "$OBSIDIAN_PLUGIN_DIR/obsidian-rg/"