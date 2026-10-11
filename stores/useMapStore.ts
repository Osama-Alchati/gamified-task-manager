import { create } from "zustand";

// Transient UI state only. XYFlow owns the camera (read it with useReactFlow / useViewport).
// Nothing here is persisted to the database.
type MapUI = {
  selectedLevelId: string | null;
  builderMode: boolean;
  soundOn: boolean;
  selectLevel: (id: string | null) => void;
  toggleBuilder: () => void;
  toggleSound: () => void;
};

export const useMapStore = create<MapUI>((set) => ({
  selectedLevelId: null,
  builderMode: false,
  soundOn: true,
  selectLevel: (id) => set({ selectedLevelId: id }),
  toggleBuilder: () => set((s) => ({ builderMode: !s.builderMode })),
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
}));
