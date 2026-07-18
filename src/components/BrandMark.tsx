// The six-petal flower/pinwheel logomark -- recreated as SVG (six identical
// ellipses rotated 60° apart around a shared center) rather than shipping a
// raster export, so it stays crisp at any size.
const PETAL_ANGLES = [0, 60, 120, 180, 240, 300];

export default function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      {PETAL_ANGLES.map((angle) => (
        <ellipse
          key={angle}
          cx="50"
          cy="25"
          rx="11"
          ry="25"
          fill="black"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}
    </svg>
  );
}
