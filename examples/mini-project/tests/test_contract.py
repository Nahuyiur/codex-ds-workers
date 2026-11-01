import unittest
from mini.text import clean_tags
from mini.stats import summarize


class TagContract(unittest.TestCase):
    def test_normalize_order_and_input_preservation(self):
        tags = ['  Robot ', '', 'ROBOT', 'Arm', ' arm ', ' Straße ']
        original = tags.copy()
        self.assertEqual(clean_tags(tags), ['robot', 'arm', 'strasse'])
        self.assertEqual(tags, original)

    def test_generator_once(self):
        self.assertEqual(clean_tags(x for x in [' A ', 'a', 'B']), ['a', 'b'])

    def test_empty(self):
        self.assertEqual(clean_tags([]), [])

    def test_invalid(self):
        for value in ['robot', b'robot', ['valid', 1], [None]]:
            with self.subTest(value=value), self.assertRaises(TypeError):
                clean_tags(value)


class StatsContract(unittest.TestCase):
    def test_values_and_input_preservation(self):
        values = [-2, 1.5, 5]
        self.assertEqual(summarize(values), {'count': 3, 'min': -2, 'max': 5, 'mean': 1.5})
        self.assertEqual(values, [-2, 1.5, 5])

    def test_generator_once(self):
        self.assertEqual(summarize(x for x in [2, 4]), {'count': 2, 'min': 2, 'max': 4, 'mean': 3})

    def test_empty(self):
        self.assertEqual(summarize([]), {'count': 0, 'min': None, 'max': None, 'mean': None})

    def test_invalid(self):
        for value in [[True], ['2'], [None]]:
            with self.subTest(value=value), self.assertRaises(TypeError):
                summarize(value)
        for value in [[float('nan')], [float('inf')], [float('-inf')]]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                summarize(value)


if __name__ == '__main__':
    unittest.main()
