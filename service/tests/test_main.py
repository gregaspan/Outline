import pytest
import re
from unittest.mock import Mock, patch, MagicMock
from docx import Document
import uuid

import sys, os
 
sys.path.insert(
    0,
    os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)

from main import (
    app,
    NAME_PATTERN,
    TYPE_PATTERN,
    CITYDATE_PATTERN,
    MANDATORY_FRONT_MATTER,
    SECTION_PATTERNS,
    _extract_paragraphs,
    _extract_notranja_info,
    _style_special_sections,
    _check_front_matter,
    _check_body_sections,
    _extract_uvod,
    _extract_toc,
    _filter_out_toc_entries,
    _calculate_structure_metrics,
    _generate_recommendations,
    _validate_naslovna_stran,
    _validate_notranja_stran,
)

class TestRegexPatterns:
    """Test regex patterns used throughout the application"""
    
    def test_name_pattern_valid(self):
        """Test valid Slovenian names"""
        valid_names = [
            "Janez Novak",
            "Ana Marija Kos",
            "Petra Žagar",
            "Matej Štefan Černe",
            "Nejc Đorđević"
        ]
        for name in valid_names:
            assert NAME_PATTERN.match(name), f"Name '{name}' should be valid"
    
    def test_name_pattern_invalid(self):
        """Test invalid names"""
        invalid_names = [
            "janez novak",  # lowercase
            "JANEZ NOVAK",  # all uppercase
            "Janez",        # single name
            "Janez123",     # contains numbers
            "Janez-Novak",  # contains hyphen
            ""              # empty string
        ]
        for name in invalid_names:
            assert not NAME_PATTERN.match(name), f"Name '{name}' should be invalid"
    
    def test_type_pattern_valid(self):
        """Test valid document types"""
        valid_types = [
            "Magistrsko delo",
            "Diplomsko delo",
            "Doktorska disertacija",
            "Kandidatensko delo",
            "magistrsko delo",  # case insensitive
            "DIPLOMSKO DELO"
        ]
        for doc_type in valid_types:
            assert TYPE_PATTERN.search(doc_type), f"Type '{doc_type}' should be valid"
    
    def test_citydate_pattern_valid(self):
        """Test valid city-date combinations"""
        valid_dates = [
            "Ljubljana, januar 2024",
            "Maribor, december 2023",
            "Kranj, maj 2024",
            "Celje, september 2023"
        ]
        for date in valid_dates:
            assert CITYDATE_PATTERN.match(date), f"Date '{date}' should be valid"
    
    def test_citydate_pattern_invalid(self):
        """Test invalid city-date combinations"""
        invalid_dates = [
            "ljubljana, januar 2024",  # lowercase city
            "Ljubljana, Januar 2024",  # uppercase month
            "Ljubljana januar 2024",   # missing comma
            "Ljubljana, jan 2024",     # abbreviated month
            "Ljubljana, januar 24"     # abbreviated year
        ]
        for date in invalid_dates:
            assert not CITYDATE_PATTERN.match(date), f"Date '{date}' should be invalid"


class TestDocumentExtraction:
    """Test document content extraction functions"""
    
    def test_extract_paragraphs(self):
        """Test paragraph extraction from Document"""
        mock_doc = Mock(spec=Document)
        mock_para1 = Mock()
        mock_para1.text = "First paragraph"
        mock_para1.style.name = "Normal"
        
        mock_para2 = Mock()
        mock_para2.text = "  Second paragraph  "
        mock_para2.style.name = "Heading 1"
        
        mock_para3 = Mock()
        mock_para3.text = "" 
        mock_para3.style.name = "Normal"
        
        mock_doc.paragraphs = [mock_para1, mock_para2, mock_para3]
        
        with patch('main.uuid.uuid4', return_value="test-id"):
            result = _extract_paragraphs(mock_doc)
        
        assert len(result) == 2 
        assert result[0]["content"] == "First paragraph"
        assert result[0]["style"] == "Normal"
        assert result[1]["content"] == "Second paragraph"  
        assert result[1]["style"] == "Heading 1"
    
    def test_extract_notranja_info(self):
        """Test extraction of internal title page information"""
        paragraphs = [
            {"content": "Advanced Machine Learning Techniques"},
            {"content": "Magistrsko delo"},
            {"content": "Študent: Janez Novak"},
            {"content": "Študijski program: Računalništvo in informatika"},
            {"content": "Univerzitetni študij"},
            {"content": "Smer: Programska oprema"},
            {"content": "Mentor: prof. dr. Ana Kos"},
            {"content": "Somentor: asist. dr. Petra Žagar"},
            {"content": "Lektor: mag. Marko Kranjc"}
        ]
        
        result = _extract_notranja_info(paragraphs)
        
        assert result["title"] == "Advanced Machine Learning Techniques"
        assert result["type"] == "Magistrsko delo"
        assert result["student"] == "Janez Novak"
        assert result["program"] == "Računalništvo in informatika — Univerzitetni študij"
        assert result["smer"] == "Programska oprema"
        assert result["mentor"] == "prof. dr. Ana Kos"
        assert result["somentor"] == "asist. dr. Petra Žagar"
        assert result["lektor"] == "mag. Marko Kranjc"
    
    def test_style_special_sections(self):
        """Test styling of special sections"""
        paragraphs = [
            {"content": "Zahvala", "style": "Normal"},
            {"content": "ZAHVALA", "style": "Normal"},
            {"content": "Povzetek", "style": "Normal"},
            {"content": "Abstract", "style": "Normal"},
            {"content": "Ključne besede: test, example", "style": "Normal"},
            {"content": "Keywords: test, example", "style": "Normal"},
            {"content": "UDK: 004.8", "style": "Normal"},
            {"content": "UDC: 004.8", "style": "Normal"},
            {"content": "Regular text", "style": "Normal"}
        ]
        
        result = _style_special_sections(paragraphs)
        
        assert result[0]["style"] == "Heading 1"  # Zahvala
        assert result[1]["style"] == "Normal"     # ZAHVALA (case sensitive)
        assert result[2]["style"] == "Heading 2"  # Povzetek
        assert result[3]["style"] == "Heading 2"  # Abstract
        assert result[4]["style"] == "Heading 2"  # Ključne besede
        assert result[5]["style"] == "Heading 2"  # Keywords
        assert result[6]["style"] == "Heading 2"  # UDK
        assert result[7]["style"] == "Heading 2"  # UDC
        assert result[8]["style"] == "Normal"     # Regular text


class TestSectionChecking:
    """Test section detection and validation"""
    
    def test_check_front_matter(self):
        """Test front matter section detection"""
        paragraphs = [
            {"content": "Janez Novak"},
            {"content": "Magistrsko delo"},
            {"content": "Ljubljana, januar 2024"},
            {"content": "Advanced Machine Learning"},
            {"content": "Študent: Janez Novak"},
            {"content": "Študijski program: Računalništvo"},
            {"content": "Smer: Programska oprema"},
            {"content": "Mentor: prof. dr. Ana Kos"},
            {"content": "Lektor: mag. Marko Kranjc"},
            {"content": "Zahvala"},
            {"content": "Povzetek"},
            {"content": "Ključne besede: test"},
            {"content": "Abstract"},
            {"content": "Keywords: test"},
            {"content": "Izjava o avtorstvu"},
            {"content": "Kazalo vsebine"}
        ]
        
        result = _check_front_matter(paragraphs)
        
        assert result["Zahvala"] == True
        assert result["Povzetek SI"] == True
        assert result["Povzetek EN"] == True
        assert result["Izjava o avtorstvu"] == True
        assert result["Kazalo vsebine"] == True
    
    def test_check_body_sections(self):
        """Test body section detection"""
        paragraphs = [
            {"content": "1. UVOD"},
            {"content": "Cilj tega dela je..."},
            {"content": "Raziskovalna vprašanja..."},
            {"content": "2. Pregled literature"},
            {"content": "3. Metodologija"},
            {"content": "4. Rezultati"},
            {"content": "5. Zaključek"}
        ]
        
        result = _check_body_sections(paragraphs)
        
        assert result["Uvod"] == True
        assert result["Pregled literature"] == True
        assert result["Metodologija"] == True
        assert result["Rezultati"] == True
        assert result["Zaključek"] == True
    
    def test_extract_uvod(self):
        """Test introduction section extraction"""
        paragraphs = [
            {"content": "Zahvala"},
            {"content": "1. UVOD"},
            {"content": "Cilj tega magistrskega dela je..."},
            {"content": "Raziskovalna vprašanja so..."},
            {"content": "Predpostavke raziskave..."},
            {"content": "2. Pregled literature"},
            {"content": "Literatura kaže..."}
        ]
        
        result = _extract_uvod(paragraphs)
        
        assert len(result) == 3
        assert "Cilj tega magistrskega dela je..." in result
        assert "Raziskovalna vprašanja so..." in result
        assert "Predpostavke raziskave..." in result
        assert "Literatura kaže..." not in result


class TestTOCProcessing:
    """Test table of contents processing"""
    
    def test_extract_toc(self):
        """Test TOC extraction"""
        paragraphs = [
            {"content": "Kazalo vsebine"},
            {"content": "1. UVOD ................................. 5"},
            {"content": "1.1 Cilj dela ........................... 6"},
            {"content": "2. Pregled literature ................... 8"},
            {"content": "2.1 Osnove strojnega učenja ............. 9"},
            {"content": "2.1.1 Supervizorsko učenje .............. 10"},
            {"content": "3. Metodologija ......................... 15"},
            {"content": "Kazalo slik"}
        ]
        
        result = _extract_toc(paragraphs)
        
        assert len(result) == 6
        assert result[0]["number"] == "1"
        assert result[0]["title"] == "UVOD"
        assert result[0]["level"] == 1
        assert result[1]["number"] == "1.1"
        assert result[1]["title"] == "Cilj dela"
        assert result[1]["level"] == 2
        assert result[4]["number"] == "2.1.1"
        assert result[4]["level"] == 3
    
    def test_filter_out_toc_entries(self):
        """Test filtering out TOC entries with dot leaders"""
        paragraphs = [
            {"content": "1. UVOD ................................. 5"},
            {"content": "This is regular content"},
            {"content": "2.1 Subsection .......................... 10"},
            {"content": "More regular content"},
        ]
        
        result = _filter_out_toc_entries(paragraphs)
        
        assert len(result) == 2
        assert result[0]["content"] == "This is regular content"
        assert result[1]["content"] == "More regular content"


class TestStructureMetrics:
    """Test structure analysis and scoring"""
    
    def test_calculate_structure_metrics_perfect_score(self):
        """Test metrics calculation for perfect document"""
        front_matter = {section: True for section in MANDATORY_FRONT_MATTER.keys()}
        body_sections = {section: True for section in SECTION_PATTERNS.keys()}
        body_sections["Uvod (s podsekcijami)"] = True
        
        uvod = [
            "Cilj tega dela je raziskovanje...",
            "Raziskovalna vprašanja vključujejo...",
            "Predpostavke naše raziskave...",
            "Omejitve raziskave so..."
        ]
        
        result = _calculate_structure_metrics(front_matter, body_sections, uvod)
        
        assert result["overall_score"] >= 95  
        assert result["found_sections"] == result["total_sections"]
        assert result["missing_critical"] == 0
        assert result["uvod_quality"] == 4
    
    def test_calculate_structure_metrics_poor_score(self):
        """Test metrics calculation for poor document"""
        front_matter = {section: False for section in MANDATORY_FRONT_MATTER.keys()}
        body_sections = {section: False for section in SECTION_PATTERNS.keys()}
        body_sections["Uvod (s podsekcijami)"] = False
        
        front_matter["Povzetek SI"] = True
        front_matter["Povzetek EN"] = True
        body_sections["Uvod"] = True
        body_sections["Zaključek"] = True
        
        uvod = []
        
        result = _calculate_structure_metrics(front_matter, body_sections, uvod)
        
        assert result["overall_score"] < 50
        assert result["found_sections"] < result["total_sections"]
        assert result["uvod_quality"] == 0
    
    def test_generate_recommendations(self):
        """Test recommendation generation"""
        recommendations = _generate_recommendations(5, 10, 2, [])
        assert any("večje popravke" in rec for rec in recommendations)
        assert any("kritičnih sekcij" in rec for rec in recommendations)
        assert any("prekratek" in rec for rec in recommendations)
        
        uvod = ["Cilj", "Raziskovalna vprašanja", "Predpostavke"]
        recommendations = _generate_recommendations(9, 10, 0, uvod)
        assert any("Odlična struktura" in rec for rec in recommendations)


class TestValidationFunctions:
    """Test validation helper functions"""
    
    def test_validate_naslovna_stran_valid(self):
        """Test valid title page validation"""
        paragraphs = [
            {"content": "Janez Novak"},
            {"content": "Advanced Machine Learning Techniques in Computer Vision"},
            {"content": "Magistrsko delo"},
            {"content": "Ljubljana, januar 2024"},
            {"content": "Fakulteta za računalništvo"},
            {"content": "Univerza v Ljubljani"}
        ]
        
        result = _validate_naslovna_stran(paragraphs)
        assert result == True
    
    def test_validate_naslovna_stran_invalid(self):
        """Test invalid title page validation"""
        paragraphs = [
            {"content": "janez novak"},  
            {"content": "Some title"},
            {"content": "Unknown document type"},  
            {"content": "Invalid date format"}
        ]
        
        result = _validate_naslovna_stran(paragraphs)
        assert result == False
    
    def test_validate_notranja_stran_valid(self):
        """Test valid internal title page validation"""
        paragraphs = [
            {"content": "Magistrsko delo"},
            {"content": "Študent(ka): Janez Novak"},
            {"content": "Študijski program: Računalništvo"},
            {"content": "Smer: Programska oprema"},
            {"content": "Mentor(ica): prof. dr. Ana Kos"},
            {"content": "Lektor(ica): mag. Marko Kranjc"}
        ]
        
        result = _validate_notranja_stran(paragraphs)
        assert result == True
    
    def test_validate_notranja_stran_invalid(self):
        """Test invalid internal title page validation"""
        paragraphs = [
            {"content": "Some title"},
            {"content": "Missing required fields"}
        ]
        
        result = _validate_notranja_stran(paragraphs)
        assert result == False


@pytest.fixture
def sample_paragraphs():
    """Sample paragraphs for testing"""
    return [
        {"id": "1", "content": "Janez Novak", "style": "Normal"},
        {"id": "2", "content": "Magistrsko delo", "style": "Normal"},
        {"id": "3", "content": "Zahvala", "style": "Normal"},
        {"id": "4", "content": "1. UVOD", "style": "Heading 1"},
        {"id": "5", "content": "Cilj dela je...", "style": "Normal"}
    ]

@pytest.fixture
def sample_toc():
    """Sample table of contents for testing"""
    return [
        {"number": "1", "title": "UVOD", "level": 1},
        {"number": "1.1", "title": "Cilj dela", "level": 2},
        {"number": "2", "title": "Metodologija", "level": 1}
    ]