using System.Globalization;
using System.IO.Compression;
using System.Text;

namespace DropshippingTools.Native.Services;

internal sealed class PdfTextExtractor
{
    public IReadOnlyList<string> ExtractLines(string filePath)
    {
        var fileBytes = File.ReadAllBytes(filePath);
        var extractedItems = new List<string>();

        foreach (var streamContent in ExtractStreamContents(fileBytes))
        {
            extractedItems.AddRange(ExtractTextItems(streamContent));
        }

        if (extractedItems.Count == 0)
        {
            extractedItems.AddRange(ExtractPrintableFallback(fileBytes));
        }

        return CleanLines(extractedItems);
    }

    private static IEnumerable<string> ExtractStreamContents(byte[] fileBytes)
    {
        var pdfText = Encoding.Latin1.GetString(fileBytes);
        var searchIndex = 0;

        while (searchIndex < pdfText.Length)
        {
            var streamIndex = pdfText.IndexOf("stream", searchIndex, StringComparison.Ordinal);
            if (streamIndex < 0)
            {
                yield break;
            }

            var dataStart = streamIndex + "stream".Length;
            if (dataStart < pdfText.Length && pdfText[dataStart] == '\r')
            {
                dataStart += 1;
            }

            if (dataStart < pdfText.Length && pdfText[dataStart] == '\n')
            {
                dataStart += 1;
            }

            var endStreamIndex = pdfText.IndexOf("endstream", dataStart, StringComparison.Ordinal);
            if (endStreamIndex < 0)
            {
                yield break;
            }

            var dictionaryStart = Math.Max(0, streamIndex - 512);
            var dictionary = pdfText[dictionaryStart..streamIndex];
            var streamLength = endStreamIndex - dataStart;
            var decoded = TryDecodeStream(fileBytes, dataStart, streamLength, dictionary);
            if (!string.IsNullOrWhiteSpace(decoded))
            {
                yield return decoded;
            }

            searchIndex = endStreamIndex + "endstream".Length;
        }
    }

    private static string TryDecodeStream(byte[] fileBytes, int offset, int length, string dictionary)
    {
        if (dictionary.Contains("/FlateDecode", StringComparison.Ordinal))
        {
            try
            {
                using var input = new MemoryStream(fileBytes, offset, length, writable: false);
                using var zlib = new ZLibStream(input, CompressionMode.Decompress);
                using var output = new MemoryStream();
                zlib.CopyTo(output);
                return Encoding.Latin1.GetString(output.ToArray());
            }
            catch
            {
                try
                {
                    using var input = new MemoryStream(fileBytes, offset, length, writable: false);
                    using var deflate = new DeflateStream(input, CompressionMode.Decompress);
                    using var output = new MemoryStream();
                    deflate.CopyTo(output);
                    return Encoding.Latin1.GetString(output.ToArray());
                }
                catch
                {
                    return string.Empty;
                }
            }
        }

        return Encoding.Latin1.GetString(fileBytes, offset, length);
    }

    private static List<string> ExtractTextItems(string content)
    {
        var results = new List<string>();
        var index = 0;

        while (index < content.Length)
        {
            var current = content[index];

            if (current == '(')
            {
                var value = ReadLiteralString(content, ref index);
                var operation = ReadOperation(content, ref index);
                if (IsTextShowingOperation(operation) && !string.IsNullOrWhiteSpace(value))
                {
                    results.Add(value);
                }

                continue;
            }

            if (current == '<' && (index + 1 >= content.Length || content[index + 1] != '<'))
            {
                var value = ReadHexString(content, ref index);
                var operation = ReadOperation(content, ref index);
                if (IsTextShowingOperation(operation) && !string.IsNullOrWhiteSpace(value))
                {
                    results.Add(value);
                }

                continue;
            }

            if (current == '[')
            {
                var value = ReadArrayString(content, ref index);
                var operation = ReadOperation(content, ref index);
                if (string.Equals(operation, "TJ", StringComparison.Ordinal) && !string.IsNullOrWhiteSpace(value))
                {
                    results.Add(value);
                }

                continue;
            }

            index += 1;
        }

        return results;
    }

    private static string ReadLiteralString(string content, ref int index)
    {
        var builder = new StringBuilder();
        var depth = 0;

        while (index < content.Length)
        {
            var current = content[index++];

            if (current == '(')
            {
                depth += 1;
                if (depth > 1)
                {
                    builder.Append(current);
                }

                continue;
            }

            if (current == ')')
            {
                depth -= 1;
                if (depth == 0)
                {
                    break;
                }

                builder.Append(current);
                continue;
            }

            if (current == '\\' && index < content.Length)
            {
                var escaped = content[index++];
                builder.Append(DecodeEscapeSequence(content, escaped, ref index));
                continue;
            }

            builder.Append(current);
        }

        return builder.ToString();
    }

    private static char DecodeEscapeSequence(string content, char escaped, ref int index)
    {
        return escaped switch
        {
            'n' => '\n',
            'r' => '\r',
            't' => '\t',
            'b' => '\b',
            'f' => '\f',
            '(' => '(',
            ')' => ')',
            '\\' => '\\',
            '\n' => '\0',
            '\r' => '\0',
            >= '0' and <= '7' => DecodeOctalSequence(content, escaped, ref index),
            _ => escaped,
        };
    }

    private static char DecodeOctalSequence(string content, char firstDigit, ref int index)
    {
        var digits = new StringBuilder();
        digits.Append(firstDigit);

        for (var count = 0; count < 2 && index < content.Length; count += 1)
        {
            var next = content[index];
            if (next is < '0' or > '7')
            {
                break;
            }

            digits.Append(next);
            index += 1;
        }

        return (char)Convert.ToInt32(digits.ToString(), 8);
    }

    private static string ReadHexString(string content, ref int index)
    {
        index += 1;
        var builder = new StringBuilder();

        while (index < content.Length && content[index] != '>')
        {
            if (!char.IsWhiteSpace(content[index]))
            {
                builder.Append(content[index]);
            }

            index += 1;
        }

        if (index < content.Length && content[index] == '>')
        {
            index += 1;
        }

        return DecodeHexText(builder.ToString());
    }

    private static string ReadArrayString(string content, ref int index)
    {
        index += 1;
        var parts = new List<string>();

        while (index < content.Length)
        {
            var current = content[index];
            if (current == ']')
            {
                index += 1;
                break;
            }

            if (current == '(')
            {
                var value = ReadLiteralString(content, ref index);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    parts.Add(value);
                }

                continue;
            }

            if (current == '<' && (index + 1 >= content.Length || content[index + 1] != '<'))
            {
                var value = ReadHexString(content, ref index);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    parts.Add(value);
                }

                continue;
            }

            index += 1;
        }

        return string.Concat(parts);
    }

    private static string ReadOperation(string content, ref int index)
    {
        while (index < content.Length && char.IsWhiteSpace(content[index]))
        {
            index += 1;
        }

        var start = index;
        while (index < content.Length && !char.IsWhiteSpace(content[index]))
        {
            if (content[index] is '[' or '(' or '<')
            {
                break;
            }

            index += 1;
        }

        return content[start..index];
    }

    private static bool IsTextShowingOperation(string operation)
    {
        return operation is "Tj" or "'" or "\"";
    }

    private static string DecodeHexText(string hex)
    {
        if (string.IsNullOrWhiteSpace(hex))
        {
            return string.Empty;
        }

        if (hex.Length % 2 != 0)
        {
            hex += "0";
        }

        var bytes = new byte[hex.Length / 2];
        var hexSpan = hex.AsSpan();

        for (var i = 0; i < bytes.Length; i += 1)
        {
            // Some Etsy PDFs contain malformed <...> blocks; skip those blocks instead of failing the whole file.
            if (!byte.TryParse(hexSpan.Slice(i * 2, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out bytes[i]))
            {
                return string.Empty;
            }
        }

        if (bytes.Length >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF)
        {
            return Encoding.BigEndianUnicode.GetString(bytes, 2, bytes.Length - 2);
        }

        if (bytes.Length >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE)
        {
            return Encoding.Unicode.GetString(bytes, 2, bytes.Length - 2);
        }

        var zeroBytes = bytes.Count(static b => b == 0);
        if (zeroBytes >= bytes.Length / 4 && bytes.Length % 2 == 0)
        {
            return Encoding.BigEndianUnicode.GetString(bytes);
        }

        return Encoding.Latin1.GetString(bytes);
    }

    private static IEnumerable<string> ExtractPrintableFallback(byte[] fileBytes)
    {
        var content = Encoding.Latin1.GetString(fileBytes);
        var builder = new StringBuilder();

        foreach (var current in content)
        {
            if (!char.IsControl(current) || current is '\n' or '\r' or '\t')
            {
                builder.Append(current);
            }
            else
            {
                builder.Append(' ');
            }
        }

        return builder
            .ToString()
            .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(static line => line.Trim())
            .Where(static line => line.Length >= 4);
    }

    private static IReadOnlyList<string> CleanLines(IEnumerable<string> lines)
    {
        var cleaned = new List<string>();

        foreach (var line in lines)
        {
            var normalized = NormalizeLine(line);

            if (string.IsNullOrWhiteSpace(normalized))
            {
                continue;
            }

            if (cleaned.Count > 0 && string.Equals(cleaned[^1], normalized, StringComparison.Ordinal))
            {
                continue;
            }

            cleaned.Add(normalized);
        }

        return cleaned;
    }

    private static string NormalizeLine(string line)
    {
        var builder = new StringBuilder(line.Length);
        var previousWasWhitespace = false;

        foreach (var current in line)
        {
            var normalized = current is '\u00A0' or '\t' ? ' ' : current;
            if (char.IsWhiteSpace(normalized))
            {
                if (builder.Length == 0 || previousWasWhitespace)
                {
                    continue;
                }

                builder.Append(' ');
                previousWasWhitespace = true;
                continue;
            }

            builder.Append(normalized);
            previousWasWhitespace = false;
        }

        if (builder.Length > 0 && builder[^1] == ' ')
        {
            builder.Length -= 1;
        }

        return builder.ToString();
    }
}
