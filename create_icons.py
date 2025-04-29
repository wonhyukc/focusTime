from PIL import Image, ImageDraw
import os


def create_timer_icon(size):
    # Create a new image with transparent background
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # Calculate dimensions
    padding = size // 8
    circle_bbox = (padding, padding, size - padding, size - padding)

    # Draw circle outline
    draw.ellipse(
        circle_bbox, outline=(52, 152, 219), width=max(1, size // 16)
    )  # Blue (#3498db)

    # Draw clock hands
    center = size // 2
    # Hour hand (pointing to 2 o'clock)
    draw.line(
        (center, center, center + size // 4 * 0.7, center - size // 4 * 0.4),
        fill=(44, 62, 80),  # Dark gray (#2c3e50)
        width=max(1, size // 16),
    )
    # Minute hand (pointing to 10)
    draw.line(
        (center, center, center - size // 4 * 0.7, center - size // 4 * 0.4),
        fill=(44, 62, 80),  # Dark gray (#2c3e50)
        width=max(1, size // 16),
    )

    return image


# Create icons directory if it doesn't exist
if not os.path.exists("icons"):
    os.makedirs("icons")

# Generate icons in different sizes
sizes = [16, 32, 48, 128]
for size in sizes:
    icon = create_timer_icon(size)
    icon.save(f"icons/icon{size}.png")

print("아이콘 생성 완료")
