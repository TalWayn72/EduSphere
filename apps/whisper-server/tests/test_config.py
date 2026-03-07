"""
Unit tests for apps/whisper-server/config.py hardware detection.
Tests run without requiring actual GPU hardware.
"""
import importlib
import importlib.util
import os
import sys
import types
import unittest
from unittest.mock import MagicMock, patch


class TestDetectHardware(unittest.TestCase):
    """Test detect_hardware() with various env var + CUDA states."""

    def setUp(self):
        # Patch ctranslate2 to avoid requiring actual GPU libraries
        self.mock_ct2 = types.ModuleType("ctranslate2")
        self.mock_ct2.get_cuda_device_count = MagicMock(return_value=0)
        sys.modules["ctranslate2"] = self.mock_ct2

        self.mock_fw = types.ModuleType("faster_whisper")
        self.mock_fw.WhisperModel = MagicMock()
        sys.modules["faster_whisper"] = self.mock_fw

    def tearDown(self):
        # Remove cached module
        sys.modules.pop("config", None)
        sys.modules.pop("ctranslate2", None)
        sys.modules.pop("faster_whisper", None)

    def _import_config(self):
        """Fresh import of config module for each test."""
        sys.modules.pop("config", None)
        # Resolve path relative to project root
        config_path = os.path.join(
            os.path.dirname(__file__), "..", "config.py"
        )
        config_path = os.path.abspath(config_path)
        spec = importlib.util.spec_from_file_location("config", config_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def test_cpu_mode_when_no_cuda(self):
        """No CUDA devices -> CPU mode with int8."""
        self.mock_ct2.get_cuda_device_count.return_value = 0
        with patch.dict("os.environ", {
            "WHISPER_DEVICE": "auto",
            "WHISPER_COMPUTE_TYPE": "auto",
        }, clear=False):
            cfg_mod = self._import_config()
            result = cfg_mod.detect_hardware()

        self.assertEqual(result["device"], "cpu")
        self.assertEqual(result["compute_type"], "int8")

    def test_gpu_mode_when_cuda_available(self):
        """1 CUDA device -> GPU mode with float16."""
        self.mock_ct2.get_cuda_device_count.return_value = 1
        with patch.dict("os.environ", {
            "WHISPER_DEVICE": "auto",
            "WHISPER_COMPUTE_TYPE": "auto",
        }, clear=False):
            cfg_mod = self._import_config()
            result = cfg_mod.detect_hardware()

        self.assertEqual(result["device"], "cuda")
        self.assertEqual(result["compute_type"], "float16")

    def test_explicit_cpu_env_overrides_detection(self):
        """Explicit WHISPER_DEVICE=cpu overrides even if CUDA present."""
        self.mock_ct2.get_cuda_device_count.return_value = 2
        with patch.dict("os.environ", {"WHISPER_DEVICE": "cpu"}, clear=False):
            cfg_mod = self._import_config()
            result = cfg_mod.detect_hardware()

        self.assertEqual(result["device"], "cpu")

    def test_explicit_cuda_env_overrides_detection(self):
        """Explicit WHISPER_DEVICE=cuda is respected (used with GPU override)."""
        self.mock_ct2.get_cuda_device_count.return_value = 0
        with patch.dict("os.environ", {
            "WHISPER_DEVICE": "cuda",
            "WHISPER_COMPUTE_TYPE": "float16",
        }, clear=False):
            cfg_mod = self._import_config()
            result = cfg_mod.detect_hardware()

        self.assertEqual(result["device"], "cuda")

    def test_model_size_adapts_to_hardware(self):
        """CPU mode uses base model; GPU mode uses large-v3 by default."""
        # CPU
        self.mock_ct2.get_cuda_device_count.return_value = 0
        with patch.dict("os.environ", {"WHISPER_DEVICE": "auto"}, clear=False):
            cfg_mod = self._import_config()
            result_cpu = cfg_mod.detect_hardware()
        self.assertEqual(result_cpu["model_size"], "base")

        # GPU
        self.mock_ct2.get_cuda_device_count.return_value = 1
        sys.modules.pop("config", None)
        with patch.dict("os.environ", {"WHISPER_DEVICE": "auto"}, clear=False):
            cfg_mod = self._import_config()
            result_gpu = cfg_mod.detect_hardware()
        self.assertEqual(result_gpu["model_size"], "large-v3")

    def test_cpu_threads_parsed_from_env(self):
        """WHISPER_CPU_THREADS is parsed as integer."""
        self.mock_ct2.get_cuda_device_count.return_value = 0
        with patch.dict("os.environ", {
            "WHISPER_DEVICE": "auto",
            "WHISPER_CPU_THREADS": "8",
        }, clear=False):
            cfg_mod = self._import_config()
            result = cfg_mod.detect_hardware()
        self.assertEqual(result["cpu_threads"], 8)

    def test_default_cpu_threads(self):
        """Default cpu_threads is 4 when WHISPER_CPU_THREADS not set."""
        self.mock_ct2.get_cuda_device_count.return_value = 0
        env = {k: v for k, v in os.environ.items() if k != "WHISPER_CPU_THREADS"}
        env["WHISPER_DEVICE"] = "auto"
        with patch.dict("os.environ", env, clear=True):
            cfg_mod = self._import_config()
            result = cfg_mod.detect_hardware()
        self.assertEqual(result["cpu_threads"], 4)

    def test_cuda_exception_falls_back_to_cpu(self):
        """If ctranslate2.get_cuda_device_count raises, falls back to CPU."""
        self.mock_ct2.get_cuda_device_count.side_effect = RuntimeError("no driver")
        with patch.dict("os.environ", {"WHISPER_DEVICE": "auto"}, clear=False):
            cfg_mod = self._import_config()
            result = cfg_mod.detect_hardware()
        self.assertEqual(result["device"], "cpu")


if __name__ == "__main__":
    unittest.main()
