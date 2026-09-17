/**
 * テストで使う toBeInTheDocument 等のマッチャを型に認識させる。
 * jest.setup.js で読み込んでいるが、tsc はセットアップファイルを見ないため
 * ここで一度 import して型拡張を効かせる。
 */
import '@testing-library/jest-dom';
