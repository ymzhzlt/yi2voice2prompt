#!/usr/bin/env python3
"""
Create a simple ICO file for Voice2Prompt application
"""

def create_simple_ico():
    # Simple ICO file header + minimal 16x16 icon data
    ico_data = bytes([
        # ICO file header
        0x00, 0x00,  # Reserved, must be 0
        0x01, 0x00,  # Image type: 1 = icon
        0x01, 0x00,  # Number of images
        
        # Image directory entry
        0x10,  # Width (16 pixels)
        0x10,  # Height (16 pixels)
        0x00,  # Number of colors (0 = no palette)
        0x00,  # Reserved
        0x01, 0x00,  # Color planes
        0x20, 0x00,  # Bits per pixel (32-bit RGBA)
        0x00, 0x04, 0x00, 0x00,  # Size of bitmap data (1024 bytes)
        0x16, 0x00, 0x00, 0x00,  # Offset to bitmap data
        
        # Bitmap data (16x16 pixels, 32-bit RGBA)
        # Simple blue microphone icon pattern
    ] + [0x00, 0x80, 0xFF, 0xFF] * 256)  # Blue pixels for simple icon
    
    return ico_data

if __name__ == "__main__":
    icon_path = r"d:\A++\自动录入声音转文字\voice2prompt\src-tauri\icons\icon.ico"
    
    with open(icon_path, 'wb') as f:
        f.write(create_simple_ico())
    
    print(f"Created icon file: {icon_path}")
