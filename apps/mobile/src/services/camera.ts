import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

export interface CameraOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  mediaTypes?: 'images' | 'videos' | 'all';
}

export interface CameraResult {
  uri: string;
  width: number;
  height: number;
  type: 'image' | 'video';
  duration?: number;
}

export class CameraService {
  async requestPermissions(): Promise<boolean> {
    const { status: cameraStatus } =
      await Camera.requestCameraPermissionsAsync();
    const { status: mediaStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    return cameraStatus === 'granted' && mediaStatus === 'granted';
  }

  async hasPermissions(): Promise<boolean> {
    const { status: cameraStatus } = await Camera.getCameraPermissionsAsync();
    const { status: mediaStatus } =
      await ImagePicker.getMediaLibraryPermissionsAsync();

    return cameraStatus === 'granted' && mediaStatus === 'granted';
  }

  async takePicture(options: CameraOptions = {}): Promise<CameraResult | null> {
    const hasPermission = await this.hasPermissions();
    if (!hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        return null;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes:
        options.mediaTypes === 'all'
          ? ImagePicker.MediaTypeOptions.All
          : options.mediaTypes === 'videos'
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect,
      quality: options.quality ?? 0.8,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      type: asset.type === 'video' ? 'video' : 'image',
      duration: asset.duration,
    };
  }

  async pickFromGallery(
    options: CameraOptions = {}
  ): Promise<CameraResult | null> {
    const hasPermission = await this.hasPermissions();
    if (!hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        return null;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        options.mediaTypes === 'all'
          ? ImagePicker.MediaTypeOptions.All
          : options.mediaTypes === 'videos'
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect,
      quality: options.quality ?? 0.8,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      type: asset.type === 'video' ? 'video' : 'image',
      duration: asset.duration,
    };
  }

  async pickMultiple(options: CameraOptions = {}): Promise<CameraResult[]> {
    const hasPermission = await this.hasPermissions();
    if (!hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        return [];
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        options.mediaTypes === 'all'
          ? ImagePicker.MediaTypeOptions.All
          : options.mediaTypes === 'videos'
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: options.quality ?? 0.8,
    });

    if (result.canceled) {
      return [];
    }

    return result.assets.map((asset) => ({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      type: asset.type === 'video' ? 'video' : 'image',
      duration: asset.duration,
    }));
  }
}

export const cameraService = new CameraService();
