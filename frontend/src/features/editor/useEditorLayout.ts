import { useEffect, useRef, useState } from 'react';


type Section = 'personal' | 'summary' | 'skills' | 'experience' | 'projects' | 'education' | 'certifications' | 'customSections';

const CLOSED_SECTIONS: Record<Section, boolean> = {
  personal: false,
  summary: false,
  skills: false,
  experience: false,
  projects: false,
  education: false,
  certifications: false,
  customSections: false,
};

export function useEditorLayout() {
  const [openSections, setOpenSections] = useState<Record<Section, boolean>>(CLOSED_SECTIONS);
  const [editorWidth, setEditorWidth] = useState(420);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(420);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSection = (section: Section) => {
    setOpenSections((prev) => {
      const wasOpen = prev[section];
      return wasOpen ? CLOSED_SECTIONS : { ...CLOSED_SECTIONS, [section]: true };
    });
  };

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = editorWidth;
    const onMove = (mouseEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.max(300, Math.min(650, dragStartWidthRef.current + mouseEvent.clientX - dragStartXRef.current));
      setEditorWidth(newWidth);
    };
    const onUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return {
    openSections,
    editorWidth,
    showMobilePreview,
    setShowMobilePreview,
    isMobile,
    toggleSection,
    handleDividerMouseDown,
  };
}
