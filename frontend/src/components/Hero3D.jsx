import Spline from '@splinetool/react-spline';

export default function Hero3D() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 0, transform: 'scale(1.2)' }}>
      <Spline
        scene="https://prod.spline.design/8zhzo1SmcAQrs2xg/scene.splinecode"
      />
    </div>
  );
}
